const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12});
document.querySelectorAll('.rv').forEach((el,i)=>{el.style.transitionDelay=(i%4)*90+'ms';io.observe(el)});
const mb=document.querySelector('.menu-btn'),mm=document.getElementById('mm');
if(mb){mb.addEventListener('click',()=>{const o=mm.classList.toggle('open');mb.setAttribute('aria-expanded',o);mb.textContent=o?'Close':'Menu'})}
const here=location.pathname.replace(/\/$/,'');document.querySelectorAll('.nav ul a').forEach(a=>{if(a.getAttribute('href')===here)a.setAttribute('aria-current','page')});

// Keep the complete stories available when JavaScript is unavailable.
const stories=document.getElementById('stories');
if(stories){
 const first=stories.querySelector('.story'), entries=[...stories.querySelectorAll('details')];
 if(first && entries.length){
  const carousel=document.createElement('div');
  carousel.className='story-carousel';carousel.setAttribute('role','region');
  carousel.setAttribute('aria-roledescription','carousel');carousel.setAttribute('aria-label','Guest testimonials');
  first.before(carousel);
  const controls=document.createElement('div');controls.className='story-controls';
  const previous=document.createElement('button'),next=document.createElement('button'),count=document.createElement('p');
  previous.type=next.type='button';previous.className=next.className='btn btn-ghost';
  previous.textContent='Previous story';next.textContent='Next story';
  count.setAttribute('role','status');count.setAttribute('aria-live','polite');count.setAttribute('aria-atomic','true');
  controls.append(previous,count,next);carousel.append(controls,first);
  first.classList.remove('rv');first.style.transitionDelay='';
  const slides=[first];
  for(const entry of entries){
   const slide=document.createElement('article'),heading=document.createElement('h3');
   slide.className='story';heading.textContent=entry.querySelector('summary').textContent;
   slide.append(heading,entry.querySelector('.prose'));carousel.append(slide);slides.push(slide);entry.remove();
  }
  slides.forEach((slide,i)=>{
   slide.id='guest-story-'+(i+1);slide.setAttribute('role','group');
   slide.setAttribute('aria-roledescription','slide');slide.setAttribute('aria-label',`${i+1} of ${slides.length}`);
  });
  let current=0;
  function showStory(index){
   current=index;slides.forEach((slide,i)=>{slide.hidden=i!==current;});
   previous.disabled=current===0;next.disabled=current===slides.length-1;
   previous.setAttribute('aria-controls',slides[current].id);next.setAttribute('aria-controls',slides[current].id);
   count.textContent=`Story ${current+1} of ${slides.length}`;
  }
  previous.addEventListener('click',()=>{if(current>0)showStory(current-1);});
  next.addEventListener('click',()=>{if(current<slides.length-1)showStory(current+1);});
  showStory(0);
 }
}
