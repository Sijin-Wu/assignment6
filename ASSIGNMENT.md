# DSCI 554 Assignment: Vue Dashboard with D3, Vega, Mapbox and deck.gl Maps.

## Description

### Objective

In this assignment, you will create a dashboard using Vue and data about countries of your choice! The dashboard will include:
- Maps created with [D3](https://d3js.org/)
- Maps created with [Vega](https://vega.github.io/vega-lite/) and rendered using [Vega-Embed](https://github.com/vega/vega-embed)
- Maps created with [Mapbox](https://www.mapbox.com/) utilizing [deck.gl](https://deck.gl/) layers

Install JavaScript dependencies using a package manager (e.g., npm or yarn). **Using a CDN to include packages is not allowed; all dependencies must be installed locally.**

## Dashboard

### 1. Data Collection
   - Select data on countries of your choice (see charts required below).
   - Select data on a city of your choice (see charts required below).
   - Download and format the necessary datasets as appropriate for the maps.

### 2. Vue App Implementation
   - Use npm install to install the necessary packages. **Using JavaScript libraries from a CDN is NOT allowed.**
   - Initialize the dashboard using the Vue framework
   - Implement a dashboard app layout using Bootstrap that includes multiple pages
   - Create a minimum of 5 pages (see charts required below)

### 3. Maps implementation

#### Overall requirements
   - A minimum of 7 maps is requested
   - It is recommended that you first create all the charts in vanilla JavaScript (e.g., in a folder separate from the framework app).
   - Create JSON or CSV files for the charts and store them in the app so the files can be loaded in the maps
   - Create components for the charts (e.g., `MyD3DotMap` component used as `<MyD3DotMap />`).
   - Use color scales and legends as appropriate.

#### Required Pages

##### Page 1 – D3 World Maps
Include at least 2 world maps with D3 (see [D3 Gallery](https://observablehq.com/@d3/gallery):
   - Use a **responsive Bootstrap grid** to arrange the charts
   - D3 choropleth world map
   - D3 proportional world symbol map

##### Page 2 – D3 and Vega City Maps
Include at least 2 city maps, 1 with D3 (see [D3 Gallery](https://observablehq.com/@d3/gallery) and 1 with [Vega-Embed](https://github.com/vega/vega-embed):
   - Use a **responsive Bootstrap grid** to arrange the charts
   - D3 choropleth map
   - Vega-Embed city choropleth Map

##### Page 3 – Mapbox Choropleth Map
Include 1 Mapbox choropleth map of neighborhoods for a city of your choice (e.g., [Join local JSON data with vector tile geometries](https://docs.mapbox.com/mapbox-gl-js/example/data-join/))

##### Page 4 – Mapbox with deck.gl Map
Include 1 Mapbox map with a deck.gl layer of your choice for a city of your choice (see [deck.gl Mapbox layer](https://deck.gl/docs/api-reference/mapbox/mapbox-layer) and [deck.gl examples](https://deck.gl/examples)

##### Page 5 – Mapbox with deck.gl Map
Include 1 Mapbox map with a deck.gl layer. The deck.gl layer must be different from the one on page 4.

## Submission

Document your work in the template provided in the [SUBMISSION.md](SUBMISSION.md).

## Rubrics

| Criteria | Excellent (4–5 pts) | Satisfactory (2–3 pts) | Needs Improvement (0–1 pts) |
|----------|---------------------|------------------------|-----------------------------|
| **Project Setup & Dependencies** | All dependencies installed locally with npm/yarn. No CDN usage. Builds/runs without errors. | Mostly installed locally. Minor setup fixes needed. | Uses CDN or missing dependencies. The project does not run. |
| **Vue App Structure** | Vue app with routing and **at least 5 pages** implemented. Logical layout. | Routing present but structure disorganized OR fewer than 5 pages. | Missing routing or clearly fewer pages than required. |
| **Page 1 – D3 World Maps** | Using responsive Bootstrap grid. Implemented correctly using D3 in its **own Vue component**. Includes choropleth and proportional symbol map.| Responsive grid implemented but not working properly. choropleth or proportional symbols render but have layout or resize bugs | Missing or nonfunctional. |
| **Page 2 – D3 and Vega City Map** | D3 and Vega maps are implemented correctly in their **own Vue component**. | Implemented but embedded inline or partially broken. | Missing or nonfunctional. |
| **Page 3 – Mapbox Choropleth Map** | Implemented correctly using Mapbox in its **own Vue component**. | Implemented but partially broken or not isolated as a component. | Missing or nonfunctional. |
| **Page 4 – Mapbox with deck.gl Map** | Mapbox with deck.gl layer map is implemented in its **own Vue component**. | Implemented but buggy or lacks component structure. | Missing or nonfunctional. |
| **Page 5 – Mapbox with deck.gl Map** | Mapbox with **different** deck.gl layer map is implemented in its **own Vue component**. | Implemented but buggy or similar to Map 4. | Missing or nonfunctional. |
| **Local Data Usage** | All maps load **local CSV/JSON files**. No external URLs. | Some maps use local data; some rely on remote sources. | Data missing or maps do not load. |
| **Generative AI Usage** | AI used effectively with **clear explanation** in documentation. | AI used, but a weak explanation. | AI not used or not documented. |

## Homework Guidelines

- Homework repository must be updated before the deadline
- **Commits after the deadline will not be considered unless requested**
- Late policy: **Only work submitted after the deadline is penalized**. A penalty of 10% of the total available points applies for each late day; any delay of less than 24 hours counts as one full day.
- Homework is expected to work in Chrome using the latest available Node LTS with up-to-date Node packages
