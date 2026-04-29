export const $=(s,root=document)=>root.querySelector(s);export const $$=(s,root=document)=>Array.from(root.querySelectorAll(s));
export function el(tag,cls='',html=''){const n=document.createElement(tag);if(cls)n.className=cls;if(html!==undefined)n.innerHTML=html;return n}
export function esc(s=''){return String(s).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]))}
export function show(n){n?.classList.remove('hidden')}export function hide(n){n?.classList.add('hidden')}export function toggle(n){n?.classList.toggle('hidden')}
export function placeMenu(menu,x,y){show(menu);const r=menu.getBoundingClientRect();menu.style.left=Math.min(x,innerWidth-r.width-8)+'px';menu.style.top=Math.min(y,innerHeight-r.height-8)+'px'}
