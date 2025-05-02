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
// 在谷歌插件的content.js中实现
// class = VuEIfc 的元素列表中中添加
// 样式参考 <div data-expandable="" jsshadow="" class="anMZof AHjck dBA1M" data-uid="c69" jsname="Zn7Xbb" jscontroller="OHz5R"><div class="rdgVoe" jsname="L9hiGd" jsslot=""><div class="Shmoqf MpvA3b"><div class="pHox4e HyA7Fb"><span class="notranslate yJu9Uc" aria-hidden="true"><svg focusable="false" width="20" height="20" viewBox="0 0 24 24" class=" NMm5M"><path d="M15 8c0-1.42-.5-2.73-1.33-3.76.42-.14.86-.24 1.33-.24 2.21 0 4 1.79 4 4s-1.79 4-4 4c-.43 0-.84-.09-1.23-.21-.03-.01-.06-.02-.1-.03A5.98 5.98 0 0 0 15 8zm1.66 5.13C18.03 14.06 19 15.32 19 17v3h4v-3c0-2.18-3.58-3.47-6.34-3.87zM9 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2m0 9c-2.7 0-5.8 1.29-6 2.01V18h12v-1c-.2-.71-3.3-2-6-2M9 4c2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4 1.79-4 4-4zm0 9c2.67 0 8 1.34 8 4v3H1v-3c0-2.66 5.33-4 8-4z"></path></svg></span></div><div data-dragsource-ignore="true" class="YwLf7b XsN7kf"><div class="HZL2hc DX1o3" jsname="Ik8OMb" jscontroller="K8MFQc" jsaction="JIbuQc:UEmoBd;AHmuwe:Jt1EX"><button jsaction="click:h5M12e; clickmod:h5M12e; pointerdown:FEiYhc; pointerup:mF5Elf; pointerenter:EX0mI; pointerleave:vpvbp; pointercancel:xyn4sd; contextmenu:xexox; focus:h06R8; blur:zjh6rb" jsshadow="" type="button" class="nUt0vb qx9Fae ZqNYof" jscontroller="xrluyc" aria-expanded="false" aria-controls="c69"><span class="RBHQF-ksKsZd" jscontroller="LBaJxb" jsname="m9ZlFb"></span><span class="OiePBf-zPjgPe SIr0ye"></span><div class="x5FT4e kkUTBb" jsslot="">添加邀请对象</div></button></div></div></div></div><div class="drQEgd" jsname="xpDKHf" jsslot="" id="c69"><div class="Shmoqf QP0Nld"><div class="pHox4e HyA7Fb"><span class="notranslate yJu9Uc" aria-hidden="true"><svg focusable="false" width="20" height="20" viewBox="0 0 24 24" class=" NMm5M"><path d="M15 8c0-1.42-.5-2.73-1.33-3.76.42-.14.86-.24 1.33-.24 2.21 0 4 1.79 4 4s-1.79 4-4 4c-.43 0-.84-.09-1.23-.21-.03-.01-.06-.02-.1-.03A5.98 5.98 0 0 0 15 8zm1.66 5.13C18.03 14.06 19 15.32 19 17v3h4v-3c0-2.18-3.58-3.47-6.34-3.87zM9 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2m0 9c-2.7 0-5.8 1.29-6 2.01V18h12v-1c-.2-.71-3.3-2-6-2M9 4c2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4 1.79-4 4-4zm0 9c2.67 0 8 1.34 8 4v3H1v-3c0-2.66 5.33-4 8-4z"></path></svg></span></div><div data-dragsource-ignore="true" class="YwLf7b XsN7kf C5Mq4e"><div><div jsaction="vvzX5e:GoWfGe;NoN6id:JVUukc;wi6wob:JVUukc" jscontroller="qRpsqb" jsname="DN6pxf"><div jsaction="O22p3e:Q1IIFc(oA4zhb);AHmuwe:G0jgYd(oA4zhb); click:KjsqPd(oA4zhb); input:YPqjbf(oA4zhb); keydown:mAamLc" jscontroller="TNIwzb" jsname="h0T7hb" data-include-contact-labels="true" data-hide-suggestions-on-empty-query="true" data-batch-select-results="true" data-suggestion-list-veid="187232" data-input-veid="39841" class="YxiWic" id="ow16" __is_owner="true"><div jsshadow="" jscontroller="i8oNZb" class="Fgl6fe-fmcmS-yrriRe-OWXEXe-H9tDt KxKnKc" data-idom-container-class="" jsname="oA4zhb" data-use-native-validation="true"><div jsaction="click:cOuCgd; keydown:I481le" jsname="vhZMvf" class="Fgl6fe-fmcmS-yrriRe Fgl6fe-fmcmS-yrriRe-OWXEXe-MFS4be Fgl6fe-fmcmS-yrriRe-OWXEXe-di8rgd-V67aGc"><span class="Fgl6fe-fmcmS-OyKIhb"></span><span class="Fgl6fe-fmcmS-wGMbrd-sM5MNb"><input jsname="YPqjbf" type="text" value="" id="c70" class="Fgl6fe-fmcmS-wGMbrd" jsaction="input:YPqjbf;focus:AHmuwe;blur:O22p3e" aria-label="邀请对象" placeholder="添加邀请对象" role="combobox" aria-autocomplete="list" aria-haspopup="true" aria-expanded="false" aria-disabled="false" autocomplete="off" aria-owns=":j" aria-controls=":j"></span><div class="Fgl6fe-fmcmS-BdhkG-ksKsZd"></div></div></div><span data-unique-tt-id="ucc-20"></span><div class="pMdX0b" jsaction="pbfq3e:eGiyHb;FwM9Ed:LfDNce" jscontroller="pqbPT" jsname="EdIvyb"><div jsname="suEOdc" id="ucc-20" class="nLdgtc OqvMgc dWdXle"></div></div></div></div><div jscontroller="UHpdjc" jsmodel="spLT2c" jsdata="YctK8c;_;$0" jsaction="rcuQ6b:npT2md;SRps4b:sI1Jxb;hJqAie:tZNBs;WhiWJd:G7RCZd;M888bd:sI1Jxb;JIbuQc:UUkoTc(UUkoTc),JPTkKc(JPTkKc),hLOY7e(hLOY7e),heerWb(heerWb),ojXjkc(ojXjkc),dqAp9(dqAp9),Qlubrf(Qlubrf);rvQICb:msHTdf" class="Pp6W3c DtKXze" data-is-selection-enabled="false" data-is-expanded="true" data-show-working-location-actions="false"><div jsname="MsyPn" class="Rzij1d" aria-hidden="true" aria-label="此活动的邀请对象。"></div></div><div jsaction="rcuQ6b:lUFH9b" jscontroller="M2XWFb" class="JmmUXc" data-ignore-rooms="true" style="display: none;"><div class="TkX6Qd"><span><span class="vqBc3c GEhdLd">* 无法显示日历</span></span><span hidden="" data-unique-tt-id="ucc-21"></span><span class="HPTfYd-suEOdc-sM5MNb-OWXEXe-nzrxxc" data-is-tooltip-wrapper="true"><button class="pYTkkf-Bz112c-LgbsSe LBr5c h2Mjwb an0qW" jscontroller="PIVayb" jsaction="click:h5M12e; clickmod:h5M12e;pointerdown:FEiYhc;pointerup:mF5Elf;pointerenter:EX0mI;pointerleave:vpvbp;pointercancel:xyn4sd;contextmenu:xexox;focus:h06R8; blur:zjh6rb;mlnRJb:fLiPzd" data-idom-class="LBr5c h2Mjwb an0qW" data-use-native-focus-logic="true" aria-label="Google 日历无法加载指定的邀请对象，原因如下：
// 邀请对象可能未使用 Google 日历。
// 您可能没有指定日历的访问权限。
// 您邀请的群组中可能有超过 200 人。
// " data-tooltip-enabled="true" data-tooltip-is-rich="true" aria-describedby="ucc-21" data-tooltip-hoist-to-body="true"><span class="OiePBf-zPjgPe pYTkkf-Bz112c-UHGRz"></span><span class="RBHQF-ksKsZd" jscontroller="LBaJxb" jsname="m9ZlFb"></span><span jsname="S5tZuc" aria-hidden="true" class="pYTkkf-Bz112c-kBDsod-Rtc0Jf"><span class="notranslate VfPpkd-kBDsod" aria-hidden="true"><svg focusable="false" width="20" height="20" viewBox="0 0 24 24" class=" NMm5M"><path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"></path></svg></span></span><div class="pYTkkf-Bz112c-RLmnJb"></div></button><div jsshadow="" jsaction="BfpAHf:TCTP9d;Nwyqre:DsZxZc; transitionend:e204de" jscontroller="VBl5Ff" data-title-id-disregard="ucc-22" id="ucc-21" class="HPTfYd-suEOdc HPTfYd-suEOdc-OWXEXe-nzrxxc rB7fOc" aria-hidden="true" role="tooltip"><span class="SXdXAb-BFbNVe HPTfYd-z59Tgd-cGMI2b-BFbNVe HPTfYd-z59Tgd-OiiCO"><span class="SXdXAb-ugnUJb"></span></span><div jsname="ebgt1d" class="HPTfYd-z59Tgd HPTfYd-z59Tgd-OiiCO"><span class="SXdXAb-BFbNVe"><span class="SXdXAb-ugnUJb"></span></span><div jsslot="" class="HPTfYd-IqDDtd">Google 日历无法加载指定的邀请对象，原因如下：<ul><li>邀请对象可能未使用 Google 日历。</li><li>您可能没有指定日历的访问权限。</li><li>您邀请的群组中可能有超过 200 人。</li></ul></div></div></div></span></div></div></div></div></div></div></div>

// 1. 添加  项目下拉选择