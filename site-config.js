// site-config.js — the one place to change your public contact email.
// When you set up a business address (for example support@fieldprovisions.app),
// replace the line below, upload this file to GitHub, and every page updates.
window.FP_SUPPORT_EMAIL = 'Fieldprovisionsapp@gmail.com';

// Rewrites any contact links/text that still show the old address.
(function(){
  var OLD = 'Fieldprovisionsapp@gmail.com', NEW = window.FP_SUPPORT_EMAIL;
  if (OLD === NEW) return;
  function fix(){
    document.querySelectorAll('a[href*="' + OLD + '"]').forEach(function(a){
      a.setAttribute('href', a.getAttribute('href').split(OLD).join(NEW));
      if (a.textContent.indexOf(OLD) !== -1) a.textContent = a.textContent.split(OLD).join(NEW);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fix); else fix();
  // Dialogs and cards are built after load, so re-check when the page changes.
  new MutationObserver(fix).observe(document.documentElement, {childList:true, subtree:true});
})();
