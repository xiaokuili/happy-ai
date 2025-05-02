import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["*://calendar.google.com/*"],
  all_frames: false
}

// 创建并插入项目选择下拉框
function addProjectSelector() {
  // 查找目标容器
  const container = document.querySelector('.VuEIfc');
  if (!container) return;

  // 创建下拉选择的HTML结构
  const projectSelectorHTML = `
    <div data-expandable="" jsshadow="" class="anMZof AHjck dBA1M">
      <div class="rdgVoe">
        <div class="Shmoqf MpvA3b">
          <div class="pHox4e HyA7Fb">
            <span class="notranslate yJu9Uc" aria-hidden="true">
              <svg focusable="false" width="20" height="20" viewBox="0 0 24 24" class="NMm5M">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </span>
          </div>
          <div data-dragsource-ignore="true" class="YwLf7b XsN7kf">
            <select class="Fgl6fe-fmcmS-wGMbrd custom-select" style="border: none; background: transparent; padding: 8px;">
              <option value="">选择项目</option>
              <option value="project1">项目一</option>
              <option value="project2">项目二</option>
              <option value="project3">项目三</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  `;

  // 将新元素插入到容器中
  container.insertAdjacentHTML('afterbegin', projectSelectorHTML);

  // 添加样式
  const style = document.createElement('style');
  style.textContent = `
    .custom-select {
      width: 200px;
      font-family: 'Google Sans',Roboto,Arial,sans-serif;
      font-size: 14px;
      color: #3c4043;
      outline: none;
    }
    .custom-select:focus {
      outline: none;
    }
  `;
  document.head.appendChild(style);
}

// 监听DOM变化，确保在正确的时机添加选择器
function initProjectSelector() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (document.querySelector('.VuEIfc') && !document.querySelector('.custom-select')) {
        addProjectSelector();
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// 初始化
initProjectSelector();
