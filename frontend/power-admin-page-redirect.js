(function () {
  var root = document.documentElement;
  var rawSection = String((root && root.dataset && root.dataset.section) || 'overview').toLowerCase();
  var allowedSections = { overview: true, users: true, links: true, activity: true, notes: true, policy: true };
  var section = allowedSections[rawSection] ? rawSection : 'overview';
  var params = new URLSearchParams(window.location.search || '');
  params.set('section', section);
  var query = params.toString();
  var target = '/power-admin.html' + (query ? '?' + query : '') + String(window.location.hash || '');
  if (window.location.pathname !== '/power-admin.html') {
    window.location.replace(target);
  }
})();
