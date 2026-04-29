export function appear(el){if(!el)return;el.classList.remove('ucmu-enter');void el.offsetWidth;el.classList.add('ucmu-enter');setTimeout(()=>el.classList.remove('ucmu-enter'),930)}
export function removeAnimated(el,done){if(!el||el.__removing)return;el.__removing=true;el.classList.remove('ucmu-enter','ucmu-remove');void el.offsetWidth;el.classList.add('ucmu-remove');setTimeout(()=>{done?.(el)},930)}
export function pending(el){el?.classList.remove('ucmu-delete-restored');el?.classList.add('ucmu-delete-pending')}
export function restore(el){if(!el)return;el.classList.remove('ucmu-delete-pending');el.classList.add('ucmu-delete-restored');setTimeout(()=>el.classList.remove('ucmu-delete-restored'),260)}
