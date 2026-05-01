const root=document.documentElement;
let lastHeight=0;
function updateKeyboard(){
  const vv=window.visualViewport;
  const appHeight=Math.round(vv?.height || window.innerHeight);
  const base=window.innerHeight;
  const keyboard=Math.max(0,base-appHeight-(vv?.offsetTop||0));
  root.style.setProperty('--app-height',appHeight+'px');
  root.style.setProperty('--keyboard-height',keyboard+'px');
  document.body.classList.toggle('keyboard-open',keyboard>80 || appHeight < base-80);
  if(Math.abs(appHeight-lastHeight)>8){
    lastHeight=appHeight;
    const feed=document.querySelector('.feed');
    if(feed) requestAnimationFrame(()=>{feed.scrollTop=feed.scrollHeight});
  }
}
if(window.visualViewport){
  visualViewport.addEventListener('resize',updateKeyboard,{passive:true});
  visualViewport.addEventListener('scroll',updateKeyboard,{passive:true});
}
window.addEventListener('resize',updateKeyboard,{passive:true});
window.addEventListener('orientationchange',()=>setTimeout(updateKeyboard,250),{passive:true});
document.addEventListener('focusin',e=>{if(e.target.matches('textarea,input')){setTimeout(updateKeyboard,60);setTimeout(updateKeyboard,220);setTimeout(updateKeyboard,520)}});
document.addEventListener('focusout',()=>{setTimeout(updateKeyboard,120);setTimeout(updateKeyboard,420)});
updateKeyboard();
window.UCMU_KEYBOARD_READY='clean-keyboard-v2';
