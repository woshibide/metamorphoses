# Metamorphoses KABK

> website for exhibition Metamorphoses of KABK Image class

## Tech Stack
- Node.js - Runtime environment
- Three.js - 3D graphics
- Theater.js - Animation
- Vite - Build tool and dev server
- Python + Jinja2 - Static site generation from CSV data

## Getting Started

### Interactive 3D Site
> assuming that node.js is installed on your system
1. Clone the repository
2. Navigate to 'vite' folder in terminal
3. Install dependencies: `npm install`
4. Run server: `npm run dev`

### Static Site Generation
> assuming that python 3.x is installed on your system
1. Navigate to project root in terminal
2. Create virtual environment: `python -m venv venv`
3. Activate virtual environment:
   - macOS/Linux: `source venv/bin/activate`
   - Windows: `venv\Scripts\activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Place your `info.csv` file in the project root
6. Generate site: `python generate_site.py`
7. Generated HTML files will be in the `prod` folder

## Resources
### Hub
- [Notion Project Hub](https://www.notion.so/Metamorphoses-Website-Team-MWT-1c78d4c5fd07804b921de84588184749)

### Learning
- [Three.js Journey](https://threejs-journey.com/lessons/introduction#introduction) - Three.js tutorial series
- [Theater.js Documentation](https://www.theatrejs.com/docs/latest#getting-started) - Animation library docs

### References
- [Three.js Bloom Example](https://github.com/mrdoob/three.js/blob/master/examples/webgpu_postprocessing_bloom_selective.html) - Reference for butterfly scene with bloom effect

