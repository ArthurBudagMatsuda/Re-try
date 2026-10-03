'use client';
import {memo,useEffect,useRef} from 'react';

export default memo(function Lore(){
 const root=useRef<HTMLElement>(null);
 useEffect(()=>{
  const section=root.current;
  if(!section||typeof IntersectionObserver==='undefined'||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){entry.target.classList.add('revealed');observer.unobserve(entry.target)}}},{threshold:.12,rootMargin:'0px 0px -24px 0px'});
  section.dataset.motion='ready';
  section.querySelectorAll('[data-reveal]').forEach(item=>observer.observe(item));
  return()=>{observer.disconnect();delete section.dataset.motion};
 },[]);
 return <section id="lore" className="lore" ref={root} aria-labelledby="lore-title">
  <div className="lore-opening" data-reveal>
   <p className="eyebrow">LORE / THE RE:TRY MANIFESTO</p>
   <h2 id="lore-title">WE ONLY<br/>NEED <span>ONE.</span></h2>
  </div>
  <div className="lore-repeat" data-reveal>
   <p>We will try again.</p>
   <p>And again.</p>
   <p>And again.</p>
  </div>
  <div className="lore-passage" data-reveal>
   <p>Some will die.<br/>Some will disappear.<br/>Some will be forgotten.</p>
   <p className="lore-quiet">They will all have a place in the cemetery.</p>
  </div>
  <div className="lore-sequence mono" data-reveal aria-label="An illustrative sequence of attempts">
   <p className="eyebrow">ONE ATTEMPT. THEN ANOTHER.</p>
   {[1,2,3].map(n=><div key={n}><span>RE:TRY #{String(n).padStart(3,'0')}</span><span className="lore-dead">DEAD</span></div>)}
   <span className="lore-ellipsis" aria-label="The attempts continue">...</span>
  </div>
  <div className="lore-passage" data-reveal>
   <p>But we will keep going.</p>
   <p className="lore-quiet">Because RE:TRY is not about getting it right<br className="lore-desktop-break"/> on the first attempt.</p>
   <p>No lost attempt is the end of RE:TRY.</p>
   <p className="lore-quiet">It&apos;s about refusing to stop<br/>until we find the one.</p>
  </div>
  <div className="lore-runner" data-reveal>
   <p>The one that runs.</p>
   <p>The one that survives.</p>
   <p>The one that grows and keeps going.</p>
   <p className="eyebrow">THE</p>
   <strong>RUNNER</strong>
  </div>
  <div className="lore-question" data-reveal>
   <p>How many attempts will it take?</p>
   <p className="lore-quiet">We don&apos;t know.</p>
   <p>We only know we&apos;ll try again.</p>
  </div>
  <div className="lore-ending" data-reveal>
   <p className="eyebrow">UNTIL THEN</p>
   <p className="lore-final">WE NEVER STOP.</p>
   <p className="lore-signature">RE<span>:</span>TRY.</p>
   <a className="lore-cemetery-link mono" href="/cemetery">VISIT THE CEMETERY <span aria-hidden="true">→</span></a>
  </div>
 </section>
});
