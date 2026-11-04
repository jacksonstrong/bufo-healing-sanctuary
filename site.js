const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12});
document.querySelectorAll('.rv').forEach((el,i)=>{el.style.transitionDelay=(i%4)*90+'ms';io.observe(el)});
const mb=document.querySelector('.menu-btn'),mm=document.getElementById('mm');
if(mb){mb.addEventListener('click',()=>{const o=mm.classList.toggle('open');mb.setAttribute('aria-expanded',o);mb.textContent=o?'Close':'Menu'})}
const here=location.pathname.replace(/\/$/,'');document.querySelectorAll('.nav ul a').forEach(a=>{if(a.getAttribute('href')===here)a.setAttribute('aria-current','page')});
