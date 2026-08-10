const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'stitch_remix_of_virrat_global_hospitality_design_showcase');
const outputDir = __dirname;

const directories = fs.readdirSync(baseDir)
  .filter(name => fs.statSync(path.join(baseDir, name)).isDirectory())
  .sort();

console.log(`Compiling ${directories.length} slides...`);

let combinedStyles = '';
let combinedHtmlSections = [];
let slideData = [];

// Helper to clean styles
function cleanStyle(styleText) {
  // Remove comment blocks and normalize whitespace
  return styleText
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();
}

// We will keep track of unique css declarations to avoid massive duplicate files
const styleBlocks = new Set();

directories.forEach((dir, index) => {
  const htmlPath = path.join(baseDir, dir, 'code.html');
  if (!fs.existsSync(htmlPath)) return;

  const content = fs.readFileSync(htmlPath, 'utf8');
  
  // 1. Extract Title
  const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/i);
  const slideTitle = titleMatch ? titleMatch[1].replace('Virrat Global - ', '').replace(' - Virrat Global', '').trim() : `Slide ${index + 1}`;

  // 2. Extract Custom Styles
  const styleMatches = content.matchAll(/<style>([\s\S]*?)<\/style>/gi);
  for (const match of styleMatches) {
    const cleaned = cleanStyle(match[1]);
    if (cleaned && !styleBlocks.has(cleaned)) {
      styleBlocks.add(cleaned);
      combinedStyles += `\n/* Styles from ${dir} */\n${cleaned}\n`;
    }
  }

  // 3. Extract Body Class names
  const bodyTagMatch = content.match(/<body([\s\S]*?)>/i);
  let bodyClass = '';
  if (bodyTagMatch) {
    const classAttrMatch = bodyTagMatch[1].match(/class="([^"]*)"/i);
    if (classAttrMatch) {
      bodyClass = classAttrMatch[1];
    }
  }

  // 4. Extract Main Content
  // We look for <main ...> ... </main>
  const mainMatch = content.match(/<main([\s\S]*?)>([\s\S]*?)<\/main>/i);
  let mainContent = '';
  let mainClass = '';

  if (mainMatch) {
    const mainAttrs = mainMatch[1];
    mainContent = mainMatch[2];
    const classAttrMatch = mainAttrs.match(/class="([^"]*)"/i);
    if (classAttrMatch) {
      mainClass = classAttrMatch[1];
    }
  } else {
    // If no <main>, let's grab anything inside <body> except the header/nav
    const bodyMatch = content.match(/<body[\s\S]*?>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      let bodyInner = bodyMatch[1];
      // strip navigation/header
      bodyInner = bodyInner.replace(/<(nav|header)[\s\S]*?<\/\1>/gi, '');
      mainContent = bodyInner;
    }
  }

  // Sanitize mainContent:
  // - Remove duplicate top navigation bars that might be nested inside main or at root
  mainContent = mainContent.replace(/<header[^>]*?(?:fixed|top-0|z-50|main-header)[^>]*?>[\s\S]*?<\/header>/gi, '');
  // Also remove simple nav bars
  mainContent = mainContent.replace(/<nav[\s\S]*?<\/nav>/gi, '');

  // Rewrite relative image paths (e.g. src="images/...") to point to their directory in root
  mainContent = mainContent.replace(/(src|href)="images\//gi, `$1="stitch_remix_of_virrat_global_hospitality_design_showcase/${dir}/images/`);


  const slideIndex = index + 1;
  const slideId = `slide-${String(slideIndex).padStart(2, '0')}`;
  
  slideData.push({
    id: slideId,
    index: slideIndex,
    title: slideTitle,
    folder: dir
  });

  // Construct section HTML
  // We keep bodyClass and mainClass to preserve layouts
  combinedHtmlSections.push(`
  <!-- Section ${slideIndex}: ${slideTitle} (${dir}) -->
  <section id="${slideId}" 
           class="slide-section w-full min-h-screen snap-start flex flex-col relative transition-all duration-700 ${bodyClass}"
           data-slide-index="${slideIndex}"
           data-slide-title="${slideTitle}">
    <div class="w-full h-full flex flex-col ${mainClass}">
      ${mainContent.trim()}
    </div>
  </section>
  `);
});

// Write style.css
// Let's filter common boilerplate styles from combinedStyles so it doesn't repeat 16 times
let finalStyles = `
/* Global overrides and layout helper classes */
:root {
  scroll-behavior: smooth;
}

body {
  overflow: hidden; /* Hide main body scrollbar, we scroll the slides container */
}

.slides-container {
  height: 100vh;
  width: 100vw;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}

.slide-section {
  scroll-snap-align: start;
  scroll-snap-stop: normal;
  flex: 0 0 100%;
  min-height: 100vh;
  box-sizing: border-box;
}

@media (max-width: 768px) {
  body {
    overflow-y: auto !important;
    height: auto !important;
  }
  .slides-container {
    display: block !important;
    height: auto !important;
    width: 100% !important;
    overflow-y: visible !important;
    overflow-x: hidden !important;
    scroll-snap-type: none !important;
  }
  .slide-section {
    scroll-snap-align: none !important;
    display: block !important;
    width: 100% !important;
    height: auto !important;
    min-height: auto !important;
    overflow-y: visible !important;
    padding-top: 3rem !important;
    padding-bottom: 3rem !important;
  }
  /* Remove full screen height restrictions on mobile contents */
  .min-h-screen, .h-screen, [class*="min-h-screen"], [class*="h-screen"] {
    min-height: auto !important;
    height: auto !important;
  }
  /* Optimize paddings and margins to reduce massive blank spaces */
  .py-32, .py-24, .py-16, .pt-32, .pb-32, .pt-24, .pb-24, .pt-\[120px\], .pb-\[120px\] {
    padding-top: 2rem !important;
    padding-bottom: 2rem !important;
  }
  .mt-32, .mb-32, .mt-24, .mb-24, .my-24, .my-32, .mb-8, .mt-12, .mb-12 {
    margin-top: 1rem !important;
    margin-bottom: 1rem !important;
  }
  .gap-24, .gap-32, .gap-16, .gap-12 {
    gap: 1rem !important;
  }
  /* Reduce heights of custom spacer elements */
  .h-24, .h-16, .h-12 {
    height: 1.5rem !important;
  }
}

.brand-logo {
  transition: filter 0.3s ease;
}
.dark .brand-logo {
  filter: drop-shadow(0 0 1px rgba(255, 255, 255, 0.85)) drop-shadow(0 0 2px rgba(255, 255, 255, 0.4));
}

/* Scrollbar Styling */
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
}
::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.4);
}

/* Slide Dots Navigation */
.dots-nav {
  position: fixed;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 40;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dot-btn {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: rgba(28, 27, 27, 0.25);
  opacity: 0.35;
  border: 1px solid transparent;
  transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.4s cubic-bezier(0.25, 1, 0.5, 1), background-color 0.4s ease, box-shadow 0.4s ease;
  cursor: pointer;
  position: relative;
}

.dark .dot-btn {
  background-color: rgba(255, 255, 255, 0.25);
}

.dot-btn::after {
  content: attr(data-tooltip);
  position: absolute;
  right: 24px;
  top: 50%;
  transform: translateY(-50%) translateX(10px);
  background-color: #1c1b1b;
  color: #ffffff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-family: 'Work Sans', sans-serif;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: all 0.3s ease;
}

.dot-btn:hover {
  opacity: 0.7;
  transform: scale(1.15);
}

.dot-btn:hover::after {
  opacity: 0.9;
  transform: translateY(-50%) translateX(0);
}

.dot-btn.active {
  background-color: #af101a; /* primary */
  opacity: 1;
  transform: scale(1.3);
  box-shadow: 0 0 6px rgba(175, 16, 26, 0.35);
}

.dark .dot-btn.active {
  background-color: #ffb4a9; /* light primary */
  box-shadow: 0 0 8px rgba(255, 180, 169, 0.4);
}

/* Glassmorphism Header */
.glass-header {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  background-color: rgba(252, 249, 248, 0.85); /* background transparent */
  border-bottom: 1px solid rgba(229, 226, 225, 0.5);
}

.dark .glass-header {
  background-color: rgba(28, 27, 27, 0.85);
  border-bottom: 1px solid rgba(91, 64, 61, 0.3);
}

/* Contact Drawer */
.contact-drawer {
  position: fixed;
  top: 0;
  right: -100%;
  width: 100%;
  max-width: 480px;
  height: 100vh;
  background-color: rgba(252, 249, 248, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: -10px 0 30px rgba(0,0,0,0.15);
  z-index: 100;
  transition: right 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
}

.dark .contact-drawer {
  background-color: rgba(28, 27, 27, 0.95);
  box-shadow: -10px 0 30px rgba(0,0,0,0.4);
}

.contact-drawer.open {
  right: 0;
}

.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  background: rgba(0,0,0,0.4);
  z-index: 95;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.5s ease;
  backdrop-filter: blur(4px);
}

.drawer-overlay.open {
  opacity: 1;
  pointer-events: auto;
}

${combinedStyles}

/* Scroll-Driven Entry Animations */
@keyframes slide-in-scale {
  from {
    opacity: 0.15;
    transform: scale(0.97) translateY(40px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@media (prefers-reduced-motion: no-preference) {
  @supports ((animation-timeline: view()) and (animation-range: entry)) {
    .slide-section > div {
      animation: slide-in-scale auto linear both;
      animation-timeline: view();
      animation-range: entry 0% entry 85%;
    }
  }
}
`;

fs.writeFileSync(path.join(outputDir, 'styles.css'), finalStyles, 'utf8');

// Generate index.html skeleton
// We need to merge meta, scripts, Tailwind setup, fonts, and slides
const htmlSkeleton = `<!DOCTYPE html>
<html class="light" lang="en">
<head>
  <meta charset="utf-8"/>
  <meta content="width=device-width, initial-scale=1.0" name="viewport"/>
  <title>Virrat Global - Food & Hospitality Portfolio Showreel</title>
  
  <!-- Tailwind CSS & Plugins -->
  <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
  
  <!-- Fonts -->
  <link href="https://fonts.googleapis.com" rel="preconnect"/>
  <link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
  <link href="https://fonts.googleapis.com/css2?family=Epilogue:wght@600;700&amp;family=Work+Sans:wght@400;600;700&amp;display=swap" rel="stylesheet"/>
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
  
  <!-- Tailwind Custom Config -->
  <script id="tailwind-config">
    tailwind.config = {
      darkMode: "class",
      theme: {
        extend: {
          "colors": {
            "inverse-primary": "#ffb3ac",
            "tertiary": "#005f7b",
            "outline-variant": "#e4beba",
            "inverse-on-surface": "#f3f0ef",
            "primary-fixed": "#ffdad6",
            "tertiary-container": "#00799c",
            "on-secondary-fixed": "#1a1c1c",
            "primary": "#af101a",
            "on-tertiary-fixed": "#001f2a",
            "surface-container-highest": "#e5e2e1",
            "on-primary-fixed": "#410003",
            "error": "#ba1a1a",
            "primary-container": "#d32f2f",
            "on-primary-container": "#fff2f0",
            "on-surface-variant": "#5b403d",
            "surface-variant": "#e5e2e1",
            "surface-tint": "#ba1a20",
            "on-tertiary-fixed-variant": "#004d65",
            "on-error": "#ffffff",
            "on-background": "#1c1b1b",
            "surface-container": "#f0eded",
            "surface-container-low": "#f6f3f2",
            "tertiary-fixed-dim": "#7bd1f8",
            "surface-dim": "#dcd9d9",
            "on-secondary-fixed-variant": "#454747",
            "surface-container-lowest": "#ffffff",
            "on-tertiary": "#ffffff",
            "on-secondary-container": "#616363",
            "on-primary": "#ffffff",
            "background": "#fcf9f8",
            "secondary-fixed-dim": "#c6c6c7",
            "on-surface": "#1c1b1b",
            "surface": "#fcf9f8",
            "surface-container-high": "#eae7e7",
            "secondary": "#5d5f5f",
            "tertiary-fixed": "#bee9ff",
            "error-container": "#ffdad6",
            "primary-fixed-dim": "#ffb3ac",
            "on-tertiary-container": "#e9f7ff",
            "outline": "#8f6f6c",
            "inverse-surface": "#313030",
            "on-primary-fixed-variant": "#930010",
            "on-secondary": "#ffffff",
            "secondary-container": "#dfe0e0",
            "surface-bright": "#fcf9f8",
            "secondary-fixed": "#e2e2e2",
            "on-error-container": "#93000a"
          },
          "borderRadius": {
            "DEFAULT": "0.25rem",
            "lg": "0.5rem",
            "xl": "0.75rem",
            "full": "9999px"
          },
          "spacing": {
            "margin-tablet": "40px",
            "container-max": "1440px",
            "margin-desktop": "80px",
            "gutter": "32px",
            "margin-mobile": "20px",
            "unit": "8px",
            "section-gap": "160px"
          },
          "fontFamily": {
            "label-caps": ["Work Sans"],
            "headline-sm": ["Epilogue"],
            "display-lg": ["Epilogue"],
            "display-lg-mobile": ["Epilogue"],
            "mono-numeral": ["Work Sans"],
            "headline-md": ["Epilogue"],
            "body-lg": ["Work Sans"],
            "body-md": ["Work Sans"]
          },
          "fontSize": {
            "label-caps": ["12px", { "lineHeight": "16px", "letterSpacing": "0.1em", "fontWeight": "600" }],
            "headline-sm": ["24px", { "lineHeight": "32px", "fontWeight": "600" }],
            "display-lg": ["72px", { "lineHeight": "80px", "letterSpacing": "-0.04em", "fontWeight": "700" }],
            "display-lg-mobile": ["40px", { "lineHeight": "48px", "letterSpacing": "-0.02em", "fontWeight": "700" }],
            "mono-numeral": ["14px", { "lineHeight": "14px", "fontWeight": "700" }],
            "headline-md": ["32px", { "lineHeight": "40px", "letterSpacing": "-0.02em", "fontWeight": "600" }],
            "body-lg": ["18px", { "lineHeight": "32px", "fontWeight": "400" }],
            "body-md": ["16px", { "lineHeight": "24px", "fontWeight": "400" }]
          }
        }
      }
    };
  </script>

  <!-- Custom Consolidated Stylesheet -->
  <link href="styles.css" rel="stylesheet"/>
</head>
<body class="bg-background text-on-background font-body-md antialiased selection:bg-primary-container selection:text-on-primary-container">

  <!-- Top Navigation Header -->
  <header class="fixed top-0 left-0 w-full z-50 transition-all duration-300 glass-header" id="global-header">
    <div class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-6 flex justify-between items-center">
      <a class="cursor-pointer hover:opacity-80 flex items-center" href="#slide-01">
        <img src="stitch_remix_of_virrat_global_hospitality_design_showcase/logo_transparent.png" alt="Virrat Global Logo" class="h-20 w-auto object-contain brand-logo"/>
      </a>
      
      <div class="flex items-center gap-6">
        <!-- Slide Count -->
        <div class="text-label-caps font-label-caps text-on-surface-variant tracking-wider" id="slide-counter">
          01 / ${directories.length}
        </div>
      </div>
    </div>
  </header>

  <!-- Slides Scroll Container -->
  <div class="slides-container" id="slides-container">
    ${combinedHtmlSections.join('\n')}
  </div>

  <!-- Vertical Dots Navigation -->
  <nav class="dots-nav" aria-label="Slides navigation">
    ${slideData.map(s => `
      <button class="dot-btn ${s.index === 1 ? 'active' : ''}" 
              data-target="${s.id}" 
              data-tooltip="${s.index}. ${s.title}"
              aria-label="Go to slide ${s.index}: ${s.title}"></button>
    `).join('')}
  </nav>

  <!-- Contact Drawer Overlay -->
  <div class="drawer-overlay" id="drawer-overlay"></div>
  
  <div class="contact-drawer" id="contact-drawer">
    <div class="flex justify-between items-center px-8 py-6 border-b border-surface-variant/30">
      <h3 class="font-headline-sm text-headline-sm text-on-background">Get in Touch</h3>
      <button id="close-drawer" class="text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center p-2 rounded-full hover:bg-surface-container" aria-label="Close Contact Drawer">
        <span class="material-symbols-outlined">close</span>
      </button>
    </div>
    
    <div class="flex-grow overflow-y-auto px-8 py-8 flex flex-col gap-8">
      <div>
        <p class="text-secondary font-body-md">
          Have an exciting food or hospitality design project? We'd love to partner with you. Let's make something exceptional.
        </p>
      </div>
      
      <!-- Contact Form -->
      <form id="contact-form" class="flex flex-col gap-6" onsubmit="event.preventDefault(); alert('Thank you! Your message has been received.');">
        <div class="flex flex-col gap-2">
          <label for="client-name" class="text-xs uppercase tracking-wider text-on-surface-variant font-label-caps font-semibold">Name</label>
          <input type="text" id="client-name" required class="w-full px-4 py-3 bg-surface-container border border-outline/30 rounded focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" placeholder="Your name"/>
        </div>
        
        <div class="flex flex-col gap-2">
          <label for="client-email" class="text-xs uppercase tracking-wider text-on-surface-variant font-label-caps font-semibold">Email</label>
          <input type="email" id="client-email" required class="w-full px-4 py-3 bg-surface-container border border-outline/30 rounded focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" placeholder="your@email.com"/>
        </div>
        
        <div class="flex flex-col gap-2">
          <label for="client-project" class="text-xs uppercase tracking-wider text-on-surface-variant font-label-caps font-semibold">Project Type</label>
          <select id="client-project" class="w-full px-4 py-3 bg-surface-container border border-outline/30 rounded focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors text-secondary">
            <option>Fine Dining Branding</option>
            <option>Quick Service Restaurant (QSR)</option>
            <option>Chai / Cafe Branding &amp; Packaging</option>
            <option>Hospitality Event Campaign</option>
            <option>Marketing Strategy &amp; Promos</option>
            <option>Other / General Inquiry</option>
          </select>
        </div>
        
        <div class="flex flex-col gap-2">
          <label for="client-message" class="text-xs uppercase tracking-wider text-on-surface-variant font-label-caps font-semibold">Message</label>
          <textarea id="client-message" rows="4" required class="w-full px-4 py-3 bg-surface-container border border-outline/30 rounded focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-none" placeholder="Tell us about your project..."></textarea>
        </div>
        
        <button type="submit" class="w-full bg-primary hover:bg-primary-container text-white py-4 rounded font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2">
          <span>Send Message</span>
          <span class="material-symbols-outlined" style="font-size: 18px;">send</span>
        </button>
      </form>

      <!-- Contact Info -->
      <div class="border-t border-surface-variant/30 pt-8 mt-4 flex flex-col gap-4">
        <div class="flex items-center gap-3">
          <span class="text-primary material-symbols-outlined">mail</span>
          <a href="mailto:virratglobal@gmail.com" class="text-on-background hover:underline font-semibold font-mono-numeral text-sm">virratglobal@gmail.com</a>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-primary material-symbols-outlined">call</span>
          <span class="text-secondary font-mono-numeral text-sm">+91 20 4515 7739</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-primary material-symbols-outlined">location_on</span>
          <span class="text-secondary text-sm">Studio 4B, Design District, New York, NY</span>
        </div>
      </div>
    </div>
  </div>

  <!-- App Script -->
  <script src="app.js"></script>
</body>
</html>
`;

fs.writeFileSync(path.join(outputDir, 'index.html'), htmlSkeleton, 'utf8');

console.log('Successfully compiled index.html and styles.css');
console.log('Slide list mapping data saved inside compile script memory.');
