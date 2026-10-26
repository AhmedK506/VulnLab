"""
Scan modes: Quick / Deep / Targeted.

A "mode" is just a configuration of how deep ZAP spiders and how hard it
attacks. This matches the IR: modes control the DEPTH and AREA of the scan
over the SAME five vulnerability types — they are not different scanners.

  spider_depth   how many links deep to crawl (0 = don't crawl)
  use_spider     whether to run the traditional spider at all
  use_ajax       whether to also run the AJAX spider (for JS-heavy sites)
  active_scan    whether to run active (attacking) scan
  strength       ZAP attack strength: 'low' | 'medium' | 'high'
"""

SCAN_MODES = {
    "Quick": {
        "spider_depth": 2,
        "use_spider": True,
        "use_ajax": False,
        "active_scan": True,
        "strength": "low",
        "description": "Fast surface scan: headers, misconfig, light injection probes.",
    },
    "Deep": {
        "spider_depth": 8,
        "use_spider": True,
        "use_ajax": True,
        "active_scan": True,
        "strength": "high",
        "description": "Full crawl and full attack across all five vulnerability types.",
    },
    "Targeted": {
        "spider_depth": 0,
        "use_spider": False,
        "use_ajax": False,
        "active_scan": True,
        "strength": "high",
        "description": "No crawl; deep active scan on the exact URL provided.",
    },
}


def get_mode(name: str) -> dict:
    return SCAN_MODES.get(name, SCAN_MODES["Quick"])
