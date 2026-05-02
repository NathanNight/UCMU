const errorEl = document.getElementById('authError');
if(errorEl){
  const observer = new MutationObserver(()=>{
    if(errorEl.textContent && errorEl.textContent.trim().length>0){
      document.body.classList.remove('auth-error-pulse');
      void document.body.offsetWidth;
      document.body.classList.add('auth-error-pulse');
      setTimeout(()=>document.body.classList.remove('auth-error-pulse'),700);
    }
  });
  observer.observe(errorEl,{childList:true});
}
