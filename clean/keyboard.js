const root=document.documentElement;
function updateKeyboard(){
  const vv=window.visualViewport;
  const base=window.innerHeight;
  const height=vv?vv.height:base;
  const offset=vv?vv.offsetTop:0;
  const keyboard=Math.max(0,base-height-offset);
  document.body.classList.toggle('keyboard-open',keyboard>80);
  root.style.setProperty('--keyboard-height',keyboard+'px');
  const feed=document.querySelector('.feed');
  if(feed&&keyboard>80) requestAnimationFrame(()=>{feed.scrollTop=feed.scrollHeight});
}
if(window.visualViewport){
  visualViewport.addEventListener('resize',updateKeyboard);
  visualViewport.addEventListener('scroll',updateKeyboard);
}
window.addEventListener('resize',updateKeyboard,{passive:true});
document.addEventListener('focusin',e=>{if(e.target.matches('textarea,input'))setTimeout(updateKeyboard,120)});
document.addEventListener('focusout',()=>setTimeout(updateKeyboard,180));
setInterval(updateKeyboard,1000);
updateKeyboard();
window.UCMU_KEYBOARD_READY='clean-keyboard-v1';
