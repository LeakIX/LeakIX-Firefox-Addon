function insertAfter(target, el) {
    if( !target.nextSibling )
        target.parentNode.appendChild( el );
    else
        target.parentNode.insertBefore( el, target.nextSibling );
};

window.onload = function () {
    var bg = chrome.extension.getBackgroundPage();
    var host = bg.getHost();

    if (host) {
        console.log(host);
        if (host.leak_count) {
            document.getElementById('leak_count').innerText = host.leak_count
        }
        if (host.severity) {
            document.getElementById('severity').innerText = host.severity
        }
        var el = document.getElementById('ip');
        if (el) {
            el.textContent = host.host;
        }
        // Update the link to the host details page
        el = document.getElementById('host-link');
        el.href = 'https://leakix.net/domain/' + host.host;
    }
}