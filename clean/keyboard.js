const root=document.documentElement;
let raf=0;
function measureCompose(){
  const compose=document.querySelector('.compose');
  const h=compose?Math.ceil(compose.getBoundingClientRect().height):58;
  root.style.setProperty('--compose-height',h+'px');
}
function updateKeyboard(){
  cancelAnimationFrame(raf);
  raf=requestAnimationFrame(()=>{
    const vv=window.visualViewport;
    const base=window.innerHeight;
    const height=Math.round(vv?.height || base);
    const offsetTop=Math.round(vv?.offsetTop || 0);
    const keyboard=Math.max(0,base-height-offsetTop);
    const open=keyboard>80 || height<base-80;
    root.style.setProperty('--app-height',height+'px');
    root.style.setProperty('--keyboard-height',keyboard+'px');
    root.style.setProperty('--keyboard-bottom',open?keyboard+'px':'0px');
    document.body.classList.toggle('keyboard-open',open);
    measureCompose();
    const feed=document.querySelector('.feed');
    if(feed&&open) feed.scrollTop=feed.scrollHeight;
  });
}
function burst(){[0,60,140,260,420,700].forEach(t=>setTimeout(updateKeyboard,t));}
if(window.visualViewport){
  visualViewport.addEventListener('resize',updateKeyboard,{passive:true});
  visualViewport.addEventListener('scroll',updateKeyboard,{passive:true});
}
window.addEventListener('resize',updateKeyboard,{passive:true});
window.addEventListener('orientationchange',()=>setTimeout(updateKeyboard,250),{passive:true});
document.addEventListener('focusin',e=>{if(e.target.matches('textarea,input'))burst()});
document.addEventListener('focusout',()=>burst());
document.addEventListener('input',e=>{if(e.target.matches('textarea'))burst()});
setInterval(updateKeyboard,1200);
updateKeyboard();
window.UCMU_KEYBOARD_READY='clean-keyboard-v3';
