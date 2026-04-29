export const DELETE_DELAY = 3000;
export const ENTER_MS = 980;
export const REMOVE_MS = 900;
export const RESTORE_MS = 420;

export function appear(el){
  if(!el) return;
  el.classList.remove('ucmu-enter','ucmu-new-flash');
  void el.offsetWidth;
  el.classList.add('ucmu-enter','ucmu-new-flash');
  setTimeout(()=>el.classList.remove('ucmu-enter'), ENTER_MS);
  setTimeout(()=>el.classList.remove('ucmu-new-flash'), 1250);
}

export function flash(el){
  if(!el) return;
  el.classList.remove('ucmu-new-flash');
  void el.offsetWidth;
  el.classList.add('ucmu-new-flash');
  setTimeout(()=>el.classList.remove('ucmu-new-flash'), 1250);
}

export function removeAnimated(el, done){
  if(!el || el.__removing) return;
  el.__removing = true;
  el.classList.remove('ucmu-enter','ucmu-new-flash','ucmu-delete-pending','ucmu-delete-restored','ucmu-remove');
  void el.offsetWidth;
  el.classList.add('ucmu-remove');
  setTimeout(()=>{ done?.(el); }, REMOVE_MS);
}

export function pending(el){
  if(!el) return;
  el.classList.remove('ucmu-delete-restored','ucmu-remove');
  void el.offsetWidth;
  el.classList.add('ucmu-delete-pending');
}

export function restore(el){
  if(!el) return;
  el.classList.remove('ucmu-delete-pending');
  el.classList.add('ucmu-delete-restored');
  setTimeout(()=>el.classList.remove('ucmu-delete-restored'), RESTORE_MS);
}
