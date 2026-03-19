# SUBMISSION

## How to Run the Dashboard

```bash
cd dashboard

npm install

# Add your Mapbox token to .env (see .env.example) before running
npm run dev
```

See the [README](dashboard/README.md) in `dashboard/` for detailed setup instructions, including how to handle the large LA building permits dataset.

### IMPORTANT INFORMATION!!
Add a `.env` file in the `dashboard/` directory with your Mapbox public token:

```
VITE_MAPBOX_TOKEN=pk.YOUR_MAPBOX_TOKEN_HERE
```

Directly uploading token to GitHub is a security risk, so the `.env` file is gitignored. You must create it yourself to run the dashboard locally.


## Documentation & Reflection

[Link to Chat with Claude AI](https://claude.ai/share/80a5adc0-de8d-4698-9b5d-8d72394740fd)

In this project, I mainly use [Claude AI](https://claude.ai) and [GitHub Copilot](https://copilot.github.com/) for code scaffolding, debugging, design refinement, and documentation.

### Use of AI for Code Scaffolding
I used `GitHub Copilot` to quickly generate boilerplate code for the Vue components, D3 visualizations, and Mapbox integration, since it can directly install dependencies in MCP Mode. This saved me a lot of time on setup and allowed me to focus on the data and design.

### Use of AI for Debugging
When I encountered errors in the D3 code or issues with the Mapbox rendering, I used `Claude AI` to help me understand the error messages and suggest fixes. For example, when I had trouble with the GeoJSON formatting for the LA permits, I requested code with debug lines like `console.log` to inspect the data at various stages, and pasted the log outputs for analysis.

### Use of AI for Design Refinement
I also used `Claude AI` to get feedback on the visual design and user experience of the dashboard. I shared screenshots and descriptions of the current design, and asked for suggestions on how to improve the layout, color scheme, and interactivity. This helped me iterate on the design more quickly than if I had to rely solely on my own judgment or external feedback.

For detailed design refinement like tuning the dot size and color in the heatmap, I found it most effective to ask `GitHub Copilot` for specific code snippets to adjust the D3 scales and styles, and then test those changes in real time.

### Use of AI for Documentation and Understanding Code
Both `Claude AI` and `GitHub Copilot` were helpful for generating documentation and comments in the code, including the `README.md` in different directories. 

### Other Uses of AI

#### Gathering Data
`Claude AI` was also useful for helping gather the data!! Thanks to the browsing capability, I was able to ask it to find the relevant LA or NYC open data sources, andeven request a direct download link for the CSV file, which saved me time navigating different data portals.

#### Preprocessing Data
When I needed to preprocess the LA building permits data, I used `Claude AI` to help me write Python scripts to filter and convert the CSV data into GeoJSON format suitable for the dashboard. Although the project is based on JavaScript tech stack, I found it more efficient to do the data manipulation in Python to filter by date and convert to GeoJSON, rather than trying to do it in JavaScript. 
### Reflect on What Worked Well and What Could be Improved
What worked well:
- The combination of `GitHub Copilot` for code scaffolding and `Claude AI` for debugging and design feedback was very effective in accelerating the development process.
- Using AI to help with data gathering and preprocessing was a time saver, especially for handling the large LA permits dataset.
- Animated time-series visualizations were well-received in terms of design and interactivity, and AI suggestions helped refine those.

What could be improved:
- I could have structured the code and components more modularly from the start, which would have made it easier to manage as the project grew. AI could have been used to suggest a better file and component structure early on.
- Time consumed for debugging D3 visualizations was still significant, and while AI helped, I think I could have been more strategic in how I asked for help to get more targeted suggestions.

### Comment on Your Overall Learning Experience

> Consider your experience with using D3, Vega, Mapbox, deck.gl, Bootstrap, Vue, and creating a basic dashboard

- Vue & Vite: I found Vue 3 with the Options API to be straightforward for building the dashboard structure and components. Vite's fast development server and hot module replacement made the development process smooth. However, I had to spend some time understanding how to manage state and props effectively across components.

- D3: I found D3 to be powerful but with a steep learning curve, especially for handling geographic data and projections. The flexibility is great, but it took time to understand how to manipulate the DOM and bind data effectively.
  
- Vega: I appreciated Vega's declarative approach to visualizations, which made it easier to create complex charts without worrying about the underlying rendering details. However, I found it less flexible than D3 for custom interactions.

- Mapbox: Mapbox GL JS was relatively easy to integrate for the tile maps, and I liked the performance benefits of using WebGL. However, I had to be mindful of the token usage and API limits when working with large datasets.
