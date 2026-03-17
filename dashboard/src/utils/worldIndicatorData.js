import * as d3 from 'd3'

const INDICATOR_CONFIG = {
    gdp: {
        key: 'gdp',
        label: 'GDP (current US$)',
        unit: 'US$ current',
        dataFile: 'data/gdp.csv',
        type: 'wide',
        fileUrl: new URL('../../data/gdp.csv', import.meta.url),
        codeField: 'Country Code',
        nameField: 'Country Name'
    },
    gdpPerCapita: {
        key: 'gdpPerCapita',
        label: 'GDP per capita (current US$)',
        unit: 'US$ per person',
        dataFile: 'data/gdp.csv + data/population.csv',
        type: 'derived',
        sourceIndicators: ['gdp', 'population']
    },
    fertility: {
        key: 'fertility',
        label: 'Fertility rate',
        unit: 'births per woman',
        dataFile: 'data/fertility_rate.csv',
        type: 'wide',
        fileUrl: new URL('../../data/fertility_rate.csv', import.meta.url),
        codeField: 'REF_AREA',
        nameField: 'REF_AREA_LABEL'
    },
    lifeExpectancy: {
        key: 'lifeExpectancy',
        label: 'Life expectancy',
        unit: 'years',
        dataFile: 'data/life_expectancy.csv',
        type: 'long',
        fileUrl: new URL('../../data/life_expectancy.csv', import.meta.url),
        codeField: 'Code',
        nameField: 'Entity',
        yearField: 'Year',
        valueField: 'Life expectancy'
    },
    population: {
        key: 'population',
        label: 'Population',
        unit: 'people',
        dataFile: 'data/population.csv',
        type: 'long',
        fileUrl: new URL('../../data/population.csv', import.meta.url),
        codeField: 'Code',
        nameField: 'Entity',
        yearField: 'Year',
        valueField: 'Population'
    }
}

export const INDICATOR_OPTIONS = Object.values(INDICATOR_CONFIG)

const datasetCache = new Map()

const parseNumericValue = (value) => {
    if (value == null || value === '') {
        return null
    }

    const parsed = Number.parseFloat(String(value).replace(/,/g, ''))
    return Number.isFinite(parsed) ? parsed : null
}

const parseWideDataset = async (config) => {
    const rows = await d3.csv(config.fileUrl)
    const firstRow = rows[0] ?? {}

    const years = Object.keys(firstRow)
        .filter((key) => /^\d{4}$/.test(key))
        .map((key) => Number.parseInt(key, 10))
        .filter((year) => year >= 1960 && year <= 2024)
        .sort((a, b) => a - b)

    const valuesByYear = new Map(years.map((year) => [year, new Map()]))
    const namesByCode = new Map()

    rows.forEach((row) => {
        const code = (row[config.codeField] ?? '').trim()
        if (!code) {
            return
        }

        const name = (row[config.nameField] ?? '').trim()
        if (name) {
            namesByCode.set(code, name)
        }

        years.forEach((year) => {
            const value = parseNumericValue(row[String(year)])
            if (value == null || value <= 0) {
                return
            }

            valuesByYear.get(year).set(code, value)
        })
    })

    return { years, valuesByYear, namesByCode }
}

const parseLongDataset = async (config) => {
    const rows = await d3.csv(config.fileUrl)
    const valuesByYear = new Map()
    const namesByCode = new Map()

    rows.forEach((row) => {
        const code = (row[config.codeField] ?? '').trim()
        const year = Number.parseInt(row[config.yearField], 10)
        const value = parseNumericValue(row[config.valueField])

        if (!code || !Number.isInteger(year) || year < 1960 || value == null || value <= 0) {
            return
        }

        const name = (row[config.nameField] ?? '').trim()
        if (name) {
            namesByCode.set(code, name)
        }

        if (!valuesByYear.has(year)) {
            valuesByYear.set(year, new Map())
        }

        valuesByYear.get(year).set(code, value)
    })

    const years = Array.from(valuesByYear.keys()).sort((a, b) => a - b)
    return { years, valuesByYear, namesByCode }
}

const deriveGdpPerCapitaDataset = async (config) => {
    const [gdpDataset, populationDataset] = await Promise.all([
        loadIndicatorDataset(config.sourceIndicators[0]),
        loadIndicatorDataset(config.sourceIndicators[1])
    ])

    const years = gdpDataset.years.filter((year) => populationDataset.valuesByYear.has(year))
    const valuesByYear = new Map()
    const namesByCode = new Map([...populationDataset.namesByCode, ...gdpDataset.namesByCode])

    years.forEach((year) => {
        const gdpMap = gdpDataset.valuesByYear.get(year)
        const popMap = populationDataset.valuesByYear.get(year)
        const perCapitaMap = new Map()

        gdpMap.forEach((gdpValue, code) => {
            const populationValue = popMap.get(code)
            if (!Number.isFinite(populationValue) || populationValue <= 0) {
                return
            }

            const perCapita = gdpValue / populationValue
            if (Number.isFinite(perCapita) && perCapita > 0) {
                perCapitaMap.set(code, perCapita)
            }
        })

        valuesByYear.set(year, perCapitaMap)
    })

    return { years, valuesByYear, namesByCode }
}

export const loadIndicatorDataset = async (indicatorKey) => {
    const config = INDICATOR_CONFIG[indicatorKey]

    if (!config) {
        throw new Error(`Unknown indicator key: ${indicatorKey}`)
    }

    if (datasetCache.has(indicatorKey)) {
        return datasetCache.get(indicatorKey)
    }

    let parsed
    if (config.type === 'wide') {
        parsed = await parseWideDataset(config)
    } else if (config.type === 'long') {
        parsed = await parseLongDataset(config)
    } else if (config.type === 'derived') {
        parsed = await deriveGdpPerCapitaDataset(config)
    } else {
        throw new Error(`Unsupported indicator type: ${config.type}`)
    }

    const dataset = {
        ...parsed,
        indicator: config
    }

    datasetCache.set(indicatorKey, dataset)
    return dataset
}
