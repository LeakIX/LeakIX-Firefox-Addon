
var hostnameCache = {};
var hostCache = {};

// Globals shared across pages
var HOST;

function getHostname(url) {
	var elem = document.createElement('a');
	elem.href = url;
	return elem.hostname;
}

function hostLookup(ip, callback) {
	var xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://leakix.net/api/ext/host/' + ip , true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
        	try {
	            var host = JSON.parse(xhr.responseText);
				console.log(host)
	            if (!host.error) {
	            	callback(host);
	            }
            }
	        catch(e) {
	        	// pass
	        }
        }
    }
    xhr.send();
}

function updateHost(host, tabId) {
	var badgeColor = "green"
	var badgeTextColor = "white"
	if (host.severity === "critical") {
		badgeColor = "red"
		badgeTextColor = "white"
	}
	chrome.browserAction.enable(tabId);
	chrome.browserAction.setBadgeText({
		'text': String(host.leak_count)
	});
	chrome.browserAction.setBadgeBackgroundColor({color: badgeColor});
	chrome.browserAction.setBadgeTextColor({color: badgeTextColor});
	// Update the globals so the popup can access the info collected in the background
	HOST = host;
}

function getHost() {
	return HOST;
}

function updateBrowserAction(tabId, url) {
	var host = {host:"",severity:"", leak_count:0};
	var hostname;

	// If the URL doesn't start with http or https then we won't go any further
	if (url.indexOf('http') === -1 && url.indexOf('https') === -1) {
		return;
	}

	hostname = getHostname(url);

	// Disable the browser action button until we know that the current
	// hostname has some data.
	chrome.browserAction.disable(tabId);
	chrome.browserAction.setBadgeText({
		text: ''
	});
	// We've previously looked up the host information for this hostname, so use it
	if (hostCache[tabId]) {
		updateHost(hostCache[tabId], tabId);
	}
	else {
		// Query information from LeakIX.net
		hostLookup(hostname, function(host) {
			// Update the host cache so we know when the browseraction needs to get updated
			hostCache[tabId] = host;
			updateHost(host, tabId);
		});
	}
};

function contextMenuHandler(info, tab) {
	var leakixUrl = 'https://leakix.net';
	var checkUrl = null;

	// The user has selected some text
	if (info.selectionText) {
		leakixUrl += '/search?q=' + encodeURI('"' + info.selectionText + '"');
	}
	else if (info.linkUrl) {
		checkUrl = info.linkUrl;
	}
	else if (info.pageUrl) {
		checkUrl = info.pageUrl;
	}
	else if (info.frameUrl) {
		checkUrl = info.frameUrl;
	}

	if (checkUrl !== null) {
		var hostname = getHostname(checkUrl);

		// Strip any prepending 'www.' if present
		if (hostname.indexOf('www.') === 0) {
			hostname = hostname.substr(4);
		}

		leakixUrl += '/search?q=host:' + encodeURI(hostname);
	}

	// If the user's selection changed the base URL then open a new tab
	if (leakixUrl !== 'https://leakix.net') {
		chrome.tabs.create({
			'url': leakixUrl
		});
	}
}

/*
 * Listen for changes in the URL in any of the tabs.
 */
chrome.tabs.onUpdated.addListener(function (id, info, tab) {
	if (tab.status === 'loading') {
		updateBrowserAction(id, tab.url);
	}
});

chrome.tabs.onActivated.addListener(function (activeInfo) {
	if (activeInfo.tabId) {
		chrome.tabs.get(activeInfo.tabId, function (tab) {
			updateBrowserAction(tab.id, tab.url);
		});
	}
});

// Cleanup the variables when a tab is closed
chrome.tabs.onRemoved.addListener(function (id) {
	delete hostnameCache[id];
	delete hostCache[id];
});

// Set the button to disabled until we get some actual data
chrome.browserAction.disable();

chrome.browserAction.setBadgeBackgroundColor({
	color: '#000'
});

// Add the ability to search LeakIX using the right-click/ context menu
chrome.contextMenus.create({
	'title': 'Search LeakIX for link',
	'contexts': ['link'],
	'onclick': contextMenuHandler
});
chrome.contextMenus.create({
	'title': 'Search LeakIX for current website',
	'contexts': ['page'],
	'onclick': contextMenuHandler
});
chrome.contextMenus.create({
	'title': 'Search LeakIX for "%s"',
	'contexts': ['selection'],
	'onclick': contextMenuHandler
});
