import * as d3 from 'd3'
import { PAGE1 } from '../config'

const INDICATOR_OPTIONS_FROM_CONFIG = PAGE1.indicators.map((indicator) => {
    const dataFiles = indicator.type === 'derived'
        ? (indicator.sourceIndicators || [])
            .map((sourceKey) => PAGE1.indicators.find((entry) => entry.key === sourceKey)?.csvPath)
            .filter(Boolean)
        : [indicator.csvPath].filter(Boolean)

    return {
        ...indicator,
        nameField: indicator.nameColumn,
        codeField: indicator.idColumn,
        yearField: indicator.yearColumn,
        valueField: indicator.valueColumn,
        dataFile: indicator.csvPath || dataFiles.join(' + '),
        dataFiles
    }
})

const INDICATOR_CONFIG = Object.fromEntries(INDICATOR_OPTIONS_FROM_CONFIG.map((entry) => [entry.key, entry]))

export const INDICATOR_OPTIONS = INDICATOR_OPTIONS_FROM_CONFIG
export const WORLD_GEOJSON_PATH = PAGE1.worldGeoJSON

const datasetCache = new Map()

const parseNumericValue = (value) => {
    if (value == null || value === '') {
        return null
    }

    const parsed = Number.parseFloat(String(value).replace(/,/g, ''))
    return Number.isFinite(parsed) ? parsed : null
}

const parseWideDataset = async (config) => {
    const rows = await d3.csv(config.csvPath)
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
    const rows = await d3.csv(config.csvPath)
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
    const resolvedType = config.type || (config.sourceIndicators ? 'derived' : (config.yearField && config.valueField ? 'long' : 'wide'))

    if (resolvedType === 'wide') {
        parsed = await parseWideDataset(config)
    } else if (resolvedType === 'long') {
        parsed = await parseLongDataset(config)
    } else if (resolvedType === 'derived') {
        parsed = await deriveGdpPerCapitaDataset(config)
    } else {
        throw new Error(`Unsupported indicator type: ${resolvedType}`)
    }

    const dataset = {
        ...parsed,
        indicator: config
    }

    datasetCache.set(indicatorKey, dataset)
    return dataset
}
