// UI behaviour for the landing page: FAQ accordion, partner form, mobile nav.

// ---------- FAQ accordion ----------

// Opens or closes one FAQ item by animating its answer's max-height to the measured content height.
function setFaqState(item, answer, open){
  answer.style.maxHeight = open ? answer.scrollHeight + 'px' : '0px';
  item.classList.toggle('open', open);
}

// Wires every FAQ item's question button to toggle its own answer.
function initFaq(){
  document.querySelectorAll('.faq-item').forEach(item=>{
    const btn = item.querySelector('.faq-q');
    const answer = item.querySelector('.faq-a');
    if(!btn || !answer) return;
    setFaqState(item, answer, item.classList.contains('open'));
    btn.addEventListener('click', ()=>{
      setFaqState(item, answer, !item.classList.contains('open'));
    });
  });

  // An open answer's pixel height is only valid for the width it was measured at, so re-measure on resize.
  window.addEventListener('resize', ()=>{
    document.querySelectorAll('.faq-item.open .faq-a').forEach(a=>{
      a.style.maxHeight = a.scrollHeight + 'px';
    });
  });
}

// ---------- Partner form ----------

// Swaps the partner form for its success message; there is no backend, so nothing is submitted.
function initPartnerForm(){
  const form = document.getElementById('partnerFormEl');
  if(!form) return;
  form.addEventListener('submit', e=>{
    e.preventDefault();
    document.getElementById('partnerForm').style.display = 'none';
    document.getElementById('formSuccess').classList.add('show');
  });
}

// ---------- Mobile menu ----------

// Toggles the mobile nav panel via a class, so no inline styles accumulate on the element.
function initMobileMenu(){
  const burger = document.querySelector('.nav__burger');
  const navLinks = document.querySelector('.nav__links');
  if(!burger || !navLinks) return;

  burger.setAttribute('aria-expanded', 'false');
  burger.addEventListener('click', ()=>{
    const open = navLinks.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
  });

  // Following an anchor leaves the panel covering the page, so close it on any link tap.
  navLinks.addEventListener('click', e=>{
    if(e.target.closest('a')){
      navLinks.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
    }
  });
}

initFaq();
initPartnerForm();
initMobileMenu();
