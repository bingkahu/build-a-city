# 🏺 Baghdad: The Great Round City 
**An Interactive 3D Architectural Reconstruction of the Abbasid Golden Age**

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Three.js](https://img.shields.io/badge/Engine-Three.js-black?style=flat&logo=three.js)
[![GitHub stars](https://img.shields.io/github/stars/bingkahu/build-a-city?style=social)](https://github.com/bingkahu/build-a-city/stargazers)

---

## ⭐ Support the Project
If you find this reconstruction helpful or interesting, **please consider giving it a star!** It helps the project gain visibility and motivates me to keep building out the historical engine.

---

## 🌐 Live Demo
**[Explore the Round City Here](https://bingkahu.github.io/build-a-city/)**

---

## 📜 Project Overview
This project is a high-performance, browser-based 3D visualization of **Baghdad (Madinat al-Salam)** as it appeared during the 8th century. Built using **Three.js**, it combines historical accuracy with modern web graphics techniques like **Instanced Rendering** to display thousands of structures at a smooth 60 FPS.

### 🔑 Key Features
* **Interactive Landmarks:** Click on the **House of Wisdom**, the **Grand Palace**, or the **City Gates** to view historical metadata.
* **Cinematic Camera:** Experience an automated fly-through of the city upon initialization.
* **Procedural Generation:** The city layout follows the historical concentric circle plan designed by Caliph al-Mansur.
* **Immersive Audio:** Features a period-appropriate soundtrack (SoundHelix Song 2) for a museum-grade experience.

---

## 🛠️ Technical Stack
* **Engine:** [Three.js](https://threejs.org/) (WebGL)
* **Optimization:** `InstancedMesh` for rendering 5,000+ unique buildings in a single draw call.
* **Interaction:** Raycasting for 3D object selection and camera interpolation.
* **Styling:** Custom CSS Glassmorphism UI.

---

## 🏗️ Installation & Local Setup
To run this project locally:

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/bingkahu/build-a-city.git](https://github.com/bingkahu/build-a-city.git)
