document.addEventListener('DOMContentLoaded', () => {
  const slidesContainer = document.getElementById('slides-container');
  const slides = Array.from(document.querySelectorAll('.slide-section'));
  const dotBtns = Array.from(document.querySelectorAll('.dot-btn'));
  const slideCounter = document.getElementById('slide-counter');
  const globalHeader = document.getElementById('global-header');
  const navLinks = Array.from(document.querySelectorAll('.nav-menu-link'));
  const themeToggleBtn = document.getElementById('theme-toggle');
  const mobileMenuToggleBtn = document.getElementById('mobile-menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  
  // Contact Drawer Elements
  const contactDrawer = document.getElementById('contact-drawer');
  const drawerOverlay = document.getElementById('drawer-overlay');
  const closeDrawerBtn = document.getElementById('close-drawer');
  const contactForm = document.getElementById('contact-form');

  let currentActiveIndex = 1;

  // Active link mapping based on sections
  // Work: Cover (1), Intro (3), Fine Dining (6), Manohar Chai (8), Chai Packaging (9), Street Food (11), Events (13), Promos (15), Selected Work (16)
  // Studio: About (2), Creative Approach (4)
  // Services: Section Dividers (5, 7, 10, 12, 14)
  const slideSectionMapping = {
    1: 'work',      // Cover
    2: 'studio',    // About Us
    3: 'work',      // Portfolio Intro
    4: 'studio',    // Creative Approach
    5: 'services',  // Section 01 Divider
    6: 'work',      // Fine Dining Showcase
    7: 'services',  // Section 02 Divider
    8: 'work',      // Manohar Chai Showcase
    9: 'work',      // Chai Packaging Showcase
    10: 'services', // Section 03 Divider
    11: 'work',     // Street Food Showcase
    12: 'work',     // Mockups Showcase
    13: 'work',     // Mockups 2 Showcase [NEW]
    14: 'services', // Section 04 Divider (originally 13)
    15: 'work',     // Hospitality Events Showcase (originally 14)
    16: 'services', // Section 05 Divider (originally 15)
    17: 'work',     // Marketing/Promotions Showcase (originally 16)
    18: 'work',     // Selected Work Montage (originally 17)
    19: 'contact'    // Thank You (originally 18)
  };

  // --- Theme Management ---
  const initializeTheme = () => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      document.documentElement.classList.add('dark');
      themeToggleBtn.querySelector('.material-symbols-outlined').textContent = 'light_mode';
    } else {
      document.documentElement.classList.remove('dark');
      themeToggleBtn.querySelector('.material-symbols-outlined').textContent = 'dark_mode';
    }
  };

  themeToggleBtn.addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    themeToggleBtn.querySelector('.material-symbols-outlined').textContent = isDark ? 'light_mode' : 'dark_mode';
  });

  // --- Scroll & Active Slide Observer ---
  const updateActiveElements = (slideIndex) => {
    currentActiveIndex = slideIndex;
    
    // Update Slide Counter
    const formattedIndex = String(slideIndex).padStart(2, '0');
    slideCounter.textContent = `${formattedIndex} / ${slides.length}`;
    
    // Update Dot indicators
    dotBtns.forEach((dot, idx) => {
      if (idx + 1 === slideIndex) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });

    // Update Top Navigation active state
    const targetSection = slideSectionMapping[slideIndex];
    navLinks.forEach(link => {
      const linkSection = link.getAttribute('data-section');
      if (linkSection === targetSection) {
        link.classList.remove('text-on-surface-variant');
        link.classList.add('text-primary');
        // Add border/active indicators if they exist
        if (!link.classList.contains('border-b-2')) {
          link.classList.add('border-b-2', 'border-primary', 'pb-1');
        }
      } else {
        link.classList.remove('text-primary', 'border-b-2', 'border-primary', 'pb-1');
        link.classList.add('text-on-surface-variant');
      }
    });

    // Toggle header opacity/blur on Cover vs Other pages
    if (slideIndex === 1) {
      globalHeader.classList.remove('shadow-sm');
    } else {
      globalHeader.classList.add('shadow-sm');
    }
  };

  const observerOptions = {
    root: slidesContainer,
    threshold: 0.51, // Trigger when more than 50% is visible
    rootMargin: '0px'
  };

  const slideObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const slideIndex = parseInt(entry.target.getAttribute('data-slide-index'), 10);
        updateActiveElements(slideIndex);
      }
    });
  }, observerOptions);

  slides.forEach(slide => slideObserver.observe(slide));

  // --- Scroll Fallback for Browsers Without Native ViewTimeline Support ---
  if (!CSS.supports('(animation-timeline: view()) and (animation-range: entry)')) {
    console.log('Scroll-Driven Animations fallback activated.');
    
    const activeIntersections = new Set();
    
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          activeIntersections.add(entry.target);
        } else {
          activeIntersections.delete(entry.target);
          // Reset styling when out of view
          const inner = entry.target.querySelector('.slide-section > div');
          if (inner) {
            inner.style.opacity = '';
            inner.style.transform = '';
          }
        }
      });
      updateAnimations();
    }, {
      root: slidesContainer,
      threshold: 0
    });

    slides.forEach(slide => io.observe(slide));

    const updateAnimations = () => {
      const containerRect = slidesContainer.getBoundingClientRect();
      const containerHeight = containerRect.height;

      activeIntersections.forEach(slide => {
        const inner = slide.querySelector('.slide-section > div');
        if (!inner) return;

        const slideRect = slide.getBoundingClientRect();
        const relativeTop = slideRect.top - containerRect.top;
        
        // Progress goes from 0 (bottom of screen) to 1 (scrolled 85% into view)
        const progress = Math.max(0, Math.min(1, (containerHeight - relativeTop) / (containerHeight * 0.85)));

        inner.style.opacity = 0.15 + progress * 0.85;
        inner.style.transform = `scale(${0.97 + progress * 0.03}) translateY(${(1 - progress) * 40}px)`;
      });
    };

    slidesContainer.addEventListener('scroll', () => {
      requestAnimationFrame(updateAnimations);
    }, { passive: true });
  }

  // --- Click Navigation Handler (Dot Navigation & Nav Links) ---
  const scrollToSlide = (slideId) => {
    const targetElement = document.getElementById(slideId);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  dotBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      scrollToSlide(targetId);
    });
  });

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const section = link.getAttribute('data-section');
      
      if (section === 'contact') {
        e.preventDefault();
        openContactDrawer();
        closeMobileMenu();
      } else {
        // Find first slide index that corresponds to this section mapping
        const targetSlideIndex = Object.keys(slideSectionMapping).find(
          key => slideSectionMapping[key] === section
        );
        
        if (targetSlideIndex) {
          e.preventDefault();
          const targetId = `slide-${String(targetSlideIndex).padStart(2, '0')}`;
          scrollToSlide(targetId);
          closeMobileMenu();
        }
      }
    });
  });

  // --- Contact Drawer logic ---
  const openContactDrawer = () => {
    contactDrawer.classList.add('open');
    drawerOverlay.classList.add('open');
    document.body.style.overflow = 'hidden'; // Stop scrolling
  };

  const closeContactDrawer = () => {
    contactDrawer.classList.remove('open');
    drawerOverlay.classList.remove('open');
    document.body.style.overflow = ''; // Re-enable scrolling
  };

  closeDrawerBtn.addEventListener('click', closeContactDrawer);
  drawerOverlay.addEventListener('click', closeContactDrawer);

  // Esc Key closes Contact Drawer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && contactDrawer.classList.contains('open')) {
      closeContactDrawer();
    }
  });

  // --- Keyboard Control for slides ---
  document.addEventListener('keydown', (e) => {
    // If contact drawer is open or form inputs are focused, don't hijack keyboard
    if (contactDrawer.classList.contains('open') || 
        document.activeElement.tagName === 'INPUT' || 
        document.activeElement.tagName === 'TEXTAREA' ||
        document.activeElement.tagName === 'SELECT') {
      return;
    }

    let targetIndex = -1;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault();
      targetIndex = Math.min(currentActiveIndex + 1, slides.length);
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      targetIndex = Math.max(currentActiveIndex - 1, 1);
    } else if (e.key === 'Spacebar' || e.key === ' ') {
      e.preventDefault();
      if (e.shiftKey) {
        targetIndex = Math.max(currentActiveIndex - 1, 1);
      } else {
        targetIndex = Math.min(currentActiveIndex + 1, slides.length);
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      targetIndex = 1;
    } else if (e.key === 'End') {
      e.preventDefault();
      targetIndex = slides.length;
    }

    if (targetIndex !== -1 && targetIndex !== currentActiveIndex) {
      const targetId = `slide-${String(targetIndex).padStart(2, '0')}`;
      scrollToSlide(targetId);
    }
  });

  // --- Touch Swipe Control for Mobile Devices ---
  let touchStartY = 0;
  let touchEndY = 0;

  slidesContainer.addEventListener('touchstart', (e) => {
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  slidesContainer.addEventListener('touchend', (e) => {
    // Skip swipe handling if the drawer is open
    if (contactDrawer.classList.contains('open')) return;

    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
  }, { passive: true });

  const handleSwipe = () => {
    const swipeThreshold = 50; // px
    const deltaY = touchEndY - touchStartY;

    if (Math.abs(deltaY) > swipeThreshold) {
      let targetIndex = currentActiveIndex;
      if (deltaY < 0) {
        // Swiped up -> Next slide
        targetIndex = Math.min(currentActiveIndex + 1, slides.length);
      } else {
        // Swiped down -> Previous slide
        targetIndex = Math.max(currentActiveIndex - 1, 1);
      }

      if (targetIndex !== currentActiveIndex) {
        const targetId = `slide-${String(targetIndex).padStart(2, '0')}`;
        scrollToSlide(targetId);
      }
    }
  };

  // --- Mobile Navigation Menu ---
  const toggleMobileMenu = () => {
    const isOpen = mobileMenu.classList.contains('opacity-100');
    if (isOpen) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  };

  const openMobileMenu = () => {
    mobileMenu.classList.remove('-translate-y-full', 'opacity-0', 'pointer-events-none');
    mobileMenu.classList.add('translate-y-0', 'opacity-100', 'pointer-events-auto');
    mobileMenuToggleBtn.querySelector('.material-symbols-outlined').textContent = 'close';
  };

  const closeMobileMenu = () => {
    mobileMenu.classList.add('-translate-y-full', 'opacity-0', 'pointer-events-none');
    mobileMenu.classList.remove('translate-y-0', 'opacity-100', 'pointer-events-auto');
    mobileMenuToggleBtn.querySelector('.material-symbols-outlined').textContent = 'menu';
  };

  mobileMenuToggleBtn.addEventListener('click', toggleMobileMenu);

  // Initialize Page State
  initializeTheme();
});
