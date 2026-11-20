/**
 * Accessible Tabs component adhering to WAI-ARIA tablist pattern.
 * Supports keyboard navigation: ArrowLeft, ArrowRight, Home, End.
 */

export function createTabs({ container, tabs, activeTabId, onTabChange }) {
  if (!container) return;
  container.innerHTML = '';

  const tabList = document.createElement('div');
  tabList.className = 'tabs-list';
  tabList.setAttribute('role', 'tablist');
  tabList.setAttribute('aria-label', 'Editor view tabs');

  const tabButtons = [];

  tabs.forEach((tab) => {
    const isActive = tab.id === activeTabId;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = `tab-${tab.id}`;
    btn.className = `tab-button ${isActive ? 'tab-button--active' : ''}`;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    btn.setAttribute('aria-controls', `panel-${tab.id}`);
    btn.setAttribute('tabindex', isActive ? '0' : '-1');
    btn.textContent = tab.label;

    btn.addEventListener('click', () => {
      selectTab(tab.id);
    });

    tabButtons.push({ id: tab.id, btn });
    tabList.appendChild(btn);
  });

  function selectTab(id) {
    tabButtons.forEach(({ id: tabId, btn }) => {
      const isSelected = tabId === id;
      btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      btn.setAttribute('tabindex', isSelected ? '0' : '-1');
      btn.classList.toggle('tab-button--active', isSelected);
      if (isSelected) {
        btn.focus();
      }
    });

    if (typeof onTabChange === 'function') {
      onTabChange(id);
    }
  }

  // Keyboard navigation
  tabList.addEventListener('keydown', (e) => {
    const currentIndex = tabButtons.findIndex((t) => t.btn === document.activeElement);
    if (currentIndex === -1) return;

    let nextIndex = null;

    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % tabButtons.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + tabButtons.length) % tabButtons.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = tabButtons.length - 1;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      selectTab(tabButtons[nextIndex].id);
    }
  });

  container.appendChild(tabList);

  return {
    setActiveTab(id) {
      selectTab(id);
    }
  };
}
