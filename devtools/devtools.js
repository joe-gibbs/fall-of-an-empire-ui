(function () {
  'use strict';

  if (!document.body) {
    document.documentElement.appendChild(document.createElement('body'));
  }

  if (!document.head) {
    document.documentElement.insertBefore(document.createElement('head'), document.body);
  }

  if (!document.getElementById('devtools-critical-style')) {
    var criticalStyle = document.createElement('style');
    criticalStyle.id = 'devtools-critical-style';
    criticalStyle.textContent = [
      'html,body,#devtools-root{width:100%;height:100%;margin:0;overflow:hidden;background-color:transparent;color:#d9e0e5;font-family:"Segoe UI",Arial,sans-serif;font-size:12px;}',
      '#devtools-root{position:fixed;left:0;top:0;right:0;bottom:0;z-index:2147482999;}',
      'button,select,input,textarea{font-family:"Segoe UI",Arial,sans-serif;font-size:12px;}',
      'button{height:24px;border-width:1px;border-style:solid;border-color:#303840;background-color:#20262b;color:#d9e0e5;padding:0 8px;}',
      'select,input,textarea{border-width:1px;border-style:solid;border-color:#303840;background-color:#0b0d0f;color:#d9e0e5;}',
      '.devtools-shell{position:fixed;z-index:2147483000;min-width:360px;min-height:260px;display:flex;flex-direction:column;overflow:hidden;background-color:#101214;border-width:1px;border-style:solid;border-color:#46515a;}',
      '.devtools-shell[data-dock="right"]{top:0;right:0;bottom:0;height:100vh;}',
      '.devtools-shell[data-dock="left"]{top:0;left:0;bottom:0;height:100vh;}',
      '.devtools-shell[data-dock="bottom"]{left:0;right:0;bottom:0;width:100vw;}',
      '.devtools-titlebar{height:34px;min-height:34px;display:flex;flex-direction:row;align-items:center;border-bottom-width:1px;border-bottom-style:solid;border-bottom-color:#303840;background-color:#171b1f;padding:0 8px;}',
      '.devtools-title{font-weight:700;color:#f0d28d;margin-right:12px;}',
      '.devtools-target,.devtools-controls,.devtools-tabs{display:flex;flex-direction:row;align-items:center;gap:6px;}',
      '.devtools-controls{margin-left:auto;}',
      '.devtools-tabs{height:30px;min-height:30px;padding:0 6px;border-bottom-width:1px;border-bottom-style:solid;border-bottom-color:#303840;background-color:#121619;}',
      '.devtools-body{flex:1;min-height:0;display:flex;overflow:hidden;}',
      '.devtools-panel{flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden;}',
      '.devtools-split{flex:1;min-height:0;display:flex;overflow:hidden;}',
      '.devtools-tree,.devtools-detail,.devtools-list,.devtools-editor,.devtools-render-grid{flex:1;min-width:0;overflow:auto;padding:8px;}',
      '.devtools-statusbar{height:24px;min-height:24px;border-top-width:1px;border-top-style:solid;border-top-color:#303840;padding:4px 8px;color:#9aa6ad;background-color:#121619;}',
    ].join('\n');
    document.head.appendChild(criticalStyle);
  }

  if (!document.getElementById('devtools-style-link')) {
    var styleLink = document.createElement('link');
    styleLink.id = 'devtools-style-link';
    styleLink.rel = 'stylesheet';
    styleLink.href = window.location && window.location.protocol === 'file:' ? './devtools.css' : 'ui://foae/devtools/devtools.css';
    document.head.appendChild(styleLink);
  }

  var root = document.getElementById('devtools-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'devtools-root';
    document.body.appendChild(root);
  }
  root.setAttribute('style', 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:2147482999;width:100%;height:100%;margin:0;overflow:hidden;background-color:transparent;color:#d9e0e5;font-family:Segoe UI,Arial,sans-serif;font-size:12px;');

  var tabs = ['UI Tree', 'Console', 'Scripts', 'Bridge Calls', 'Profiler', 'Render'];
  var dockModes = ['left', 'right', 'bottom', 'floating'];
  var state = loadState();
  var data = createEmptyData();
  var dragState = null;

  function createEmptyData() {
    return {
      targets: [],
      dom: null,
      styles: null,
      console: [],
      scripts: [],
      bridgeCalls: [],
      profiler: null,
      render: null,
      attached: false,
      error: '',
    };
  }

  function loadState() {
    var saved = safeParse(readSessionValue('foae-devtools-state'));
    return Object.assign({
      hostMode: 'viewport',
      dock: 'right',
      width: 560,
      height: 410,
      floating: { x: 96, y: 80, width: 760, height: 520 },
      collapsed: false,
      activeTab: 'UI Tree',
      selectedTargetId: '',
      selectedNodeId: '',
      selectedScriptId: '',
      selectedBridgeCallId: '',
      consoleInput: '',
      expandedNodes: {},
    }, saved || {});
  }

  function persistState() {
    writeSessionValue('foae-devtools-state', JSON.stringify({
      dock: state.dock,
      width: state.width,
      height: state.height,
      floating: state.floating,
      collapsed: state.collapsed,
      activeTab: state.activeTab,
      selectedTargetId: state.selectedTargetId,
      selectedNodeId: state.selectedNodeId,
      selectedScriptId: state.selectedScriptId,
      selectedBridgeCallId: state.selectedBridgeCallId,
      expandedNodes: state.expandedNodes,
    }));
  }

  function readSessionValue(key) {
    try {
      return window.sessionStorage ? window.sessionStorage.getItem(key) : null;
    } catch (error) {
      return null;
    }
  }

  function writeSessionValue(key, value) {
    try {
      if (window.sessionStorage) {
        window.sessionStorage.setItem(key, value);
      }
    } catch (error) {
    }
  }

  function safeParse(raw) {
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function json(value) {
    return escapeHtml(JSON.stringify(value == null ? null : value, null, 2));
  }

  function roundMs(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function engine() {
    return window.engine && typeof window.engine.call === 'function' ? window.engine : null;
  }

  var BRIDGE_RESPONSE_EVENT = 'bridge:ui.bridge_response';

  function parseEnvelope(raw) {
    var envelope = typeof raw === 'string' ? safeParse(raw) : raw;
    if (!envelope || typeof envelope !== 'object') {
      return raw;
    }
    if (Object.prototype.hasOwnProperty.call(envelope, 'ok')) {
      if (!envelope.ok) {
        throw new Error(envelope.error || 'DevTools bridge call failed');
      }
      return envelope.result;
    }
    return envelope;
  }

  function bridgeRequestId() {
    return 'devtools-' + Date.now() + '-' + Math.floor(Math.random() * 1000000);
  }

  function bridgeCall(action, payload) {
    var runtime = engine();
    if (!runtime) {
      return Promise.resolve(mockCall(action, payload || {}));
    }

    var requestId = bridgeRequestId();
    var request = {
      action: action,
      payload: payload || {},
      requestId: requestId,
    };

    return new Promise(function (resolve, reject) {
      var timeoutId = 0;
      var settled = false;

      function cleanup() {
        if (timeoutId !== 0) {
          window.clearTimeout(timeoutId);
        }
        window.removeEventListener(BRIDGE_RESPONSE_EVENT, handleResponse);
      }

      function settle(raw) {
        if (settled) return;
        settled = true;
        cleanup();
        try {
          resolve(parseEnvelope(raw));
        } catch (error) {
          reject(error);
        }
      }

      function handleResponse(event) {
        var detail = event && event.detail;
        if (!detail || detail.requestId !== requestId) return;
        settle(detail.response);
      }

      window.addEventListener(BRIDGE_RESPONSE_EVENT, handleResponse);
      timeoutId = window.setTimeout(function () {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error('DevTools bridge call timed out'));
      }, 30000);

      Promise.resolve(runtime.call('StrategyBridgeBatchCall', { requests: [request] }))
        .then(function (raw) {
          var envelope = typeof raw === 'string' ? safeParse(raw) : raw;
          if (envelope && envelope.pending) {
            return;
          }
          settle(raw);
        })
        .catch(function (error) {
          if (settled) return;
          settled = true;
          cleanup();
          reject(error);
        });
    });
  }

  function requestHostMode(mode) {
    return bridgeCall('devtools.set_host_mode', { mode: mode }).then(function (response) {
      if (response && response.mode) {
        state.hostMode = response.mode === 'window' ? 'window' : 'viewport';
      } else {
        state.hostMode = mode === 'window' ? 'window' : 'viewport';
      }
      render();
    });
  }

  function installEngineEvents() {
    var runtime = engine();
    if (!runtime || typeof runtime.on !== 'function') {
      return;
    }
    runtime.on('StrategyBridgeEvent', function (name, payload) {
      if (name === 'devtools.host_mode') {
        state.hostMode = payload && payload.mode === 'window' ? 'window' : 'viewport';
        render();
        return;
      }
      if (name === 'devtools.targets_changed') refreshTargets();
      if (name === 'devtools.console_entry') {
        data.console.push(payload);
        render();
      }
      if (name === 'devtools.bridge_call_event') {
        upsertRecord(data.bridgeCalls, payload, 'id');
        render();
      }
      if (name === 'devtools.render_stats') {
        data.render = payload;
        render();
      }
      if (name === 'devtools.target_destroyed' && payload && payload.targetId === state.selectedTargetId) {
        data.attached = false;
        state.selectedTargetId = '';
        render();
      }
    });
  }

  function upsertRecord(records, record, key) {
    if (!record || !record[key]) {
      return;
    }
    var index = records.findIndex(function (item) { return item[key] === record[key]; });
    if (index >= 0) {
      records[index] = Object.assign({}, records[index], record);
      return;
    }
    records.unshift(record);
  }

  function parseNameValueList(items) {
    var result = {};
    (items || []).forEach(function (item) {
      var text = String(item || '');
      var equals = text.indexOf('=');
      var colon = text.indexOf(':');
      var split = equals >= 0 ? equals : colon;
      if (split < 0) {
        result[text] = '';
        return;
      }
      var key = text.slice(0, split).trim();
      var value = text.slice(split + 1).trim().replace(/^["']|["']$/g, '');
      if (key) {
        result[key] = value;
      }
    });
    return result;
  }

  function styleListToProperties(items) {
    var properties = [];
    (items || []).forEach(function (item) {
      var text = String(item || '');
      var colon = text.indexOf(':');
      if (colon < 0) {
        return;
      }
      properties.push({
        name: text.slice(0, colon).trim(),
        value: text.slice(colon + 1).trim(),
      });
    });
    return properties;
  }

  function styleListToObject(items) {
    var result = {};
    styleListToProperties(items).forEach(function (property) {
      result[property.name] = property.value;
    });
    return result;
  }

  function normaliseDom(response) {
    if (response && response.root) {
      return response.root;
    }
    var nodes = response && response.nodes ? response.nodes : [];
    if (!nodes.length) {
      return null;
    }
    var mapped = nodes.map(function (node, index) {
      var attrs = parseNameValueList(node.attributes || []);
      if (node.id) attrs.id = node.id;
      if (node.className) attrs.class = node.className;
      if (node.text) attrs.text = node.text;
      return {
        id: 'node-' + node.index,
        elementId: node.id || '',
        nativeIndex: node.index,
        parentIndex: node.parentIndex,
        name: node.tagName || node.debugName || node.nodeType || ('node-' + index),
        nodeType: node.nodeType || '',
        debugName: node.debugName || '',
        attributes: attrs,
        inlineStyle: node.inlineStyle || [],
        computedStyle: node.computedStyle || [],
        box: {
          x: node.x || 0,
          y: node.y || 0,
          width: node.width || 0,
          height: node.height || 0,
        },
        children: [],
      };
    });
    var byIndex = {};
    mapped.forEach(function (node) { byIndex[node.nativeIndex] = node; });
    var rootNode = mapped[0];
    mapped.forEach(function (node) {
      if (node.parentIndex >= 0 && byIndex[node.parentIndex]) {
        byIndex[node.parentIndex].children.push(node);
      } else {
        rootNode = node;
      }
    });
    return rootNode;
  }

  function stylesFromNode(node) {
    if (!node) return null;
    return {
      matched: [
        { selector: node.name || node.debugName || node.id, properties: styleListToProperties(node.inlineStyle || []) },
      ],
      computed: styleListToObject(node.computedStyle || []),
      box: {
        margin: '0',
        border: '0',
        width: Math.round((node.box && node.box.width) || 0) + 'px',
        height: Math.round((node.box && node.box.height) || 0) + 'px',
      },
    };
  }

  function normaliseStyles(response, node) {
    if (response && response.matched) {
      return response;
    }
    if (response && response.found) {
      return {
        matched: [
          { selector: response.tagName || response.id || 'element', properties: styleListToProperties(response.inlineStyle || []) },
        ],
        computed: styleListToObject(response.computedStyle || []),
        box: {
          margin: '0',
          border: '0',
          width: Math.round(response.width || 0) + 'px',
          height: Math.round(response.height || 0) + 'px',
        },
      };
    }
    return stylesFromNode(node);
  }

  function normaliseConsole(response) {
    if (response && response.entries) {
      return response.entries;
    }
    return (response && response.events ? response.events : []).map(function (entry) {
      return {
        method: entry.defaultPrevented ? 'handled' : 'event',
        message: [entry.event, entry.target || entry.tagName || entry.id || '', entry.detail || ''].filter(Boolean).join(' '),
        source: entry.source || entry.phase || '',
        line: entry.frame || 0,
      };
    });
  }

  function refreshTargets() {
    return bridgeCall('devtools.list_targets', {}).then(function (response) {
      data.targets = response && response.targets ? response.targets : [];
      if (!state.selectedTargetId && data.targets.length > 0) {
        state.selectedTargetId = data.targets[0].id;
      }
      render();
      return attachSelectedTarget();
    });
  }

  function attachSelectedTarget() {
    if (!state.selectedTargetId) {
      data.attached = false;
      render();
      return Promise.resolve();
    }
    return bridgeCall('devtools.attach_target', { targetId: state.selectedTargetId }).then(function (response) {
      data.attached = response ? response.attached !== false : true;
      state.selectedNodeId = '';
      state.selectedScriptId = '';
      state.selectedBridgeCallId = '';
      return refreshAllPanels();
    });
  }

  function refreshAllPanels() {
    var targetId = state.selectedTargetId;
    if (!targetId) {
      render();
      return Promise.resolve();
    }

    return Promise.all([
      bridgeCall('devtools.get_dom', { targetId: targetId }).then(function (response) {
        data.dom = normaliseDom(response);
        if (!state.selectedNodeId && data.dom) {
          state.selectedNodeId = data.dom.id;
          state.expandedNodes[data.dom.id] = true;
        }
      }),
      bridgeCall('devtools.get_console', { targetId: targetId }).then(function (response) {
        data.console = normaliseConsole(response);
      }),
      bridgeCall('devtools.get_scripts', { targetId: targetId }).then(function (response) {
        data.scripts = response && response.scripts ? response.scripts : [];
        if (!state.selectedScriptId && data.scripts.length > 0) {
          state.selectedScriptId = data.scripts[0].id;
        }
      }),
      bridgeCall('devtools.get_bridge_calls', { targetId: targetId }).then(function (response) {
        data.bridgeCalls = response && response.records ? response.records : [];
        if (!state.selectedBridgeCallId && data.bridgeCalls.length > 0) {
          state.selectedBridgeCallId = data.bridgeCalls[0].id;
        }
      }),
      bridgeCall('devtools.get_render_stats', { targetId: targetId }).then(function (response) {
        data.render = response || null;
      }),
      bridgeCall('devtools.get_profiler_summary', { targetId: targetId }).then(function (response) {
        data.profiler = response || null;
      }),
    ]).then(function () {
      return refreshSelectedNodeStyles();
    }).catch(function (error) {
      data.error = error && error.message ? error.message : String(error);
      render();
    });
  }

  function refreshSelectedNodeStyles() {
    if (!state.selectedTargetId || !state.selectedNodeId) {
      data.styles = null;
      render();
      return Promise.resolve();
    }
    var node = selectedNode();
    if (!node || !node.elementId) {
      data.styles = stylesFromNode(node);
      render();
      return Promise.resolve();
    }
    return bridgeCall('devtools.get_node_styles', {
      targetId: state.selectedTargetId,
      nodeId: node.elementId,
    }).then(function (response) {
      data.styles = normaliseStyles(response, node);
      render();
    }).catch(function () {
      data.styles = stylesFromNode(node);
      render();
    });
  }

  function selectedTarget() {
    return data.targets.find(function (target) { return target.id === state.selectedTargetId; }) || null;
  }

  function findNode(node, id) {
    if (!node || !id) return null;
    if (node.id === id) return node;
    var children = node.children || [];
    for (var index = 0; index < children.length; index += 1) {
      var result = findNode(children[index], id);
      if (result) return result;
    }
    return null;
  }

  function selectedNode() {
    return findNode(data.dom, state.selectedNodeId);
  }

  function selectedSource() {
    return data.scripts.find(function (script) { return script.id === state.selectedScriptId; }) || data.scripts[0] || null;
  }

  function selectedBridgeCallRecord() {
    return data.bridgeCalls.find(function (record) { return record.id === state.selectedBridgeCallId; }) || data.bridgeCalls[0] || null;
  }

  function shellStyle() {
    var baseStyle = 'position:fixed;z-index:2147483000;min-width:360px;min-height:260px;display:flex;flex-direction:column;overflow:hidden;background-color:#101214;border-width:1px;border-style:solid;border-color:#46515a;color:#d9e0e5;';
    if (state.hostMode === 'window') {
      return baseStyle + 'left:0px;top:0px;width:' + Math.max(1, window.innerWidth) + 'px;height:' + Math.max(1, window.innerHeight) + 'px;';
    }
    if (state.dock === 'right' || state.dock === 'left') {
      return baseStyle + 'width:' + clamp(state.width, 360, Math.max(360, window.innerWidth - 80)) + 'px;';
    }
    if (state.dock === 'bottom') {
      return baseStyle + 'height:' + clamp(state.height, 260, Math.max(260, window.innerHeight - 80)) + 'px;';
    }
    var rect = state.floating;
    var width = clamp(rect.width, 360, Math.max(360, window.innerWidth - 24));
    var height = clamp(rect.height, 260, Math.max(260, window.innerHeight - 24));
    var x = clamp(rect.x, 0, Math.max(0, window.innerWidth - width));
    var y = clamp(rect.y, 0, Math.max(0, window.innerHeight - height));
    state.floating = { x: x, y: y, width: width, height: height };
    return baseStyle + 'left:' + x + 'px;top:' + y + 'px;width:' + width + 'px;height:' + height + 'px;';
  }

  function render() {
    persistState();
    root.innerHTML =
      '<section class="devtools-shell ' + (state.collapsed ? 'is-collapsed' : '') + '" data-dock="' + escapeHtml(state.dock) + '" style="' + shellStyle() + '">' +
        renderTitlebar() +
        renderTabs() +
        '<main class="devtools-body">' + renderActiveTab() + '</main>' +
        renderStatusbar() +
        renderResizers() +
      '</section>';
    bindEvents();
  }

  function renderTitlebar() {
    var options = data.targets.map(function (target) {
      var selected = target.id === state.selectedTargetId ? ' selected' : '';
      return '<option value="' + escapeHtml(target.id) + '"' + selected + '>' +
        escapeHtml(target.title || target.id) + '</option>';
    }).join('');
    if (!options) {
      options = '<option value="">No targets</option>';
    }
    var dockButtons = dockModes.map(function (mode) {
      var label = mode === 'floating' ? 'Float' : mode.charAt(0).toUpperCase();
      return '<button class="devtools-icon-button ' + (state.dock === mode ? 'is-active' : '') + '" data-action="dock" data-dock="' + mode + '">' + label + '</button>';
    }).join('');
    return '' +
      '<header class="devtools-titlebar" data-drag="titlebar">' +
        '<div class="devtools-title">FoaeCefUI DevTools</div>' +
        '<div class="devtools-target">' +
          '<span class="devtools-target-label">Target</span>' +
          '<select data-action="target">' + options + '</select>' +
          '<span class="devtools-attach-state">' + (data.attached ? 'Attached' : 'Detached') + '</span>' +
        '</div>' +
        '<div class="devtools-controls">' +
          dockButtons +
          '<button class="devtools-icon-button" data-action="collapse">' + (state.collapsed ? '+' : '-') + '</button>' +
          '<button class="devtools-icon-button" data-action="close">X</button>' +
        '</div>' +
      '</header>';
  }

  function renderTabs() {
    return '<nav class="devtools-tabs">' + tabs.map(function (tab) {
      return '<button class="devtools-tab ' + (state.activeTab === tab ? 'is-active' : '') + '" data-action="tab" data-tab="' + tab + '">' + tab + '</button>';
    }).join('') + '</nav>';
  }

  function renderStatusbar() {
    var target = selectedTarget();
    return '<footer class="devtools-statusbar">' +
      '<span>' + escapeHtml(target ? target.entryPoint || target.url || target.id : 'No target selected') + '</span>' +
      '<span>Console ' + data.console.length + '</span>' +
      '<span>Bridge calls ' + data.bridgeCalls.length + '</span>' +
      (data.error ? '<span>Error ' + escapeHtml(data.error) + '</span>' : '') +
    '</footer>';
  }

  function renderResizers() {
    if (state.collapsed) return '';
    if (state.hostMode === 'window') return '';
    if (state.dock === 'right') return '<div class="devtools-resizer edge-left" data-resize="left"></div>';
    if (state.dock === 'left') return '<div class="devtools-resizer edge-right" data-resize="right"></div>';
    if (state.dock === 'bottom') return '<div class="devtools-resizer edge-top" data-resize="top"></div>';
    return '<div class="devtools-resizer corner" data-resize="corner"></div>';
  }

  function renderActiveTab() {
    if (!state.selectedTargetId) {
      return '<div class="devtools-empty">No inspectable FoaeCefUI target is available.</div>';
    }
    if (state.activeTab === 'UI Tree') return renderUiTree();
    if (state.activeTab === 'Console') return renderConsole();
    if (state.activeTab === 'Scripts') return renderScripts();
    if (state.activeTab === 'Bridge Calls') return renderBridgeCalls();
    if (state.activeTab === 'Profiler') return renderProfiler();
    return renderRenderStats();
  }

  function renderUiTree() {
    var node = selectedNode();
    return '<div class="devtools-pane-grid">' +
      '<section class="devtools-pane"><div class="devtools-pane-header">UI Tree</div><div class="devtools-tree">' + renderTree(data.dom, 0) + '</div></section>' +
      '<section class="devtools-pane devtools-sidebar-stack">' +
        renderNodeDetails(node) +
        renderStyles() +
      '</section>' +
    '</div>';
  }

  function renderTree(node, depth) {
    if (!node) return '<div class="devtools-empty">No UI tree snapshot.</div>';
    var attrs = node.attributes || {};
    var attrText = Object.keys(attrs).slice(0, 3).map(function (key) {
      return ' <span class="devtools-node-attr">' + escapeHtml(key) + '</span>="<span class="devtools-node-value">' + escapeHtml(attrs[key]) + '</span>"';
    }).join('');
    var children = node.children || [];
    var expanded = state.expandedNodes[node.id] === true;
    var childMarkup = expanded ? children.map(function (child) { return renderTree(child, depth + 1); }).join('') : '';
    var indents = '';
    for (var i = 0; i < depth; i += 1) indents += '<span class="devtools-tree-indent"></span>';
    return '<div class="devtools-tree-row ' + (node.id === state.selectedNodeId ? 'is-selected' : '') + '" data-node-id="' + escapeHtml(node.id) + '">' +
      indents +
      '<span class="devtools-tree-toggle" data-action="toggle-node" data-node-id="' + escapeHtml(node.id) + '">' + (children.length ? (expanded ? '-' : '+') : '') + '</span>' +
      '&lt;<span class="devtools-node-name">' + escapeHtml(node.name || 'node') + '</span>' + attrText + '&gt;' +
    '</div>' + childMarkup;
  }

  function renderNodeDetails(node) {
    if (!node) return '<div class="devtools-empty">Select a node.</div>';
    var attrs = node.attributes || {};
    var attrRows = Object.keys(attrs).map(function (key) {
      return '<dt>' + escapeHtml(key) + '</dt><dd>' + escapeHtml(attrs[key]) + '</dd>';
    }).join('') || '<dt>Attributes</dt><dd>None</dd>';
    return '<section class="devtools-section"><h3>Selected Node</h3><dl class="devtools-kv">' +
      '<dt>Node</dt><dd>' + escapeHtml(node.name) + '</dd>' +
      '<dt>Id</dt><dd>' + escapeHtml(node.id) + '</dd>' +
      attrRows +
      '</dl></section>';
  }

  function renderStyles() {
    if (!data.styles) return '<div class="devtools-empty">No style data.</div>';
    var matched = (data.styles.matched || []).map(function (rule) {
      return '<div class="devtools-style-rule">' +
        '<div class="devtools-style-selector">' + escapeHtml(rule.selector) + '</div>' +
        (rule.properties || []).map(function (prop) {
          return '<div class="devtools-style-prop"><span>' + escapeHtml(prop.name) + '</span><span>' + escapeHtml(prop.value) + '</span></div>';
        }).join('') +
      '</div>';
    }).join('');
    var computed = data.styles.computed || {};
    var computedRows = Object.keys(computed).map(function (key) {
      return '<dt>' + escapeHtml(key) + '</dt><dd>' + escapeHtml(computed[key]) + '</dd>';
    }).join('');
    var box = data.styles.box || {};
    return '<section class="devtools-section"><h3>Matched Styles</h3>' + (matched || '<div class="devtools-empty">No matched rules.</div>') + '</section>' +
      '<section class="devtools-section"><h3>Computed</h3><dl class="devtools-kv">' + computedRows + '</dl></section>' +
      '<section class="devtools-section"><h3>Box Model</h3><div class="devtools-box-model">margin ' + escapeHtml(box.margin || '0') +
        '<div>border ' + escapeHtml(box.border || '0') + '<div>' + escapeHtml(box.width || '0') + ' x ' + escapeHtml(box.height || '0') + '</div></div></div></section>';
  }

  function renderConsole() {
    var rows = data.console.map(function (entry) {
      return '<div class="devtools-console-row" data-method="' + escapeHtml(entry.method || 'log') + '">' +
        '<span class="devtools-console-method">' + escapeHtml(entry.method || 'log') + '</span>' +
        '<span class="devtools-console-message">' + escapeHtml(entry.message || '') + '</span>' +
        '<span class="devtools-console-source">' + escapeHtml(entry.source || '') + (entry.line ? ':' + escapeHtml(entry.line) : '') + '</span>' +
      '</div>';
    }).join('');
    return '<section class="devtools-console">' +
      '<div class="devtools-console-list">' + (rows || '<div class="devtools-empty">No console entries.</div>') + '</div>' +
      '<form class="devtools-console-input" data-action="evaluate">' +
        '<input data-console-input value="' + escapeHtml(state.consoleInput) + '" autocomplete="off" />' +
        '<button type="submit">Evaluate</button>' +
      '</form>' +
    '</section>';
  }

  function renderScripts() {
    var source = selectedSource();
    var list = data.scripts.map(function (item) {
      return '<div class="devtools-script-row ' + (item.id === state.selectedScriptId ? 'is-selected' : '') + '" data-source-id="' + escapeHtml(item.id) + '">' +
        escapeHtml(item.path || item.url || item.id) +
      '</div>';
    }).join('');
    var sourceLines = source ? String(source.content || '').split('\n').map(function (line, index) {
      return '<div class="devtools-script-line"><span class="devtools-script-line-number">' + (index + 1) + '</span><span class="devtools-script-code">' + escapeHtml(line) + '</span></div>';
    }).join('') : '<div class="devtools-empty">No script selected.</div>';
    return '<div class="devtools-pane-grid three">' +
      '<section class="devtools-pane"><div class="devtools-pane-header">Scripts</div><div class="devtools-script-list">' + list + '</div></section>' +
      '<section class="devtools-pane"><div class="devtools-pane-header">' +
        '<button data-action="debugger" data-command="pause">Pause</button>' +
        '<button data-action="debugger" data-command="resume">Resume</button>' +
        '<button data-action="debugger" data-command="stepOver">Step</button>' +
      '</div><pre class="devtools-script-view">' + sourceLines + '</pre></section>' +
      '<section class="devtools-pane devtools-sidebar-stack">' +
        '<section class="devtools-section"><h3>Call Stack</h3><pre class="devtools-json">' + json(source && source.callStack ? source.callStack : []) + '</pre></section>' +
        '<section class="devtools-section"><h3>Scopes</h3><pre class="devtools-json">' + json(source && source.scopes ? source.scopes : {}) + '</pre></section>' +
      '</section>' +
    '</div>';
  }

  function renderBridgeCalls() {
    var rows = data.bridgeCalls.map(function (record) {
      return '<tr class="' + (record.id === state.selectedBridgeCallId ? 'is-selected' : '') + '" data-bridge-call-id="' + escapeHtml(record.id) + '">' +
        '<td>' + escapeHtml(record.time || '') + '</td>' +
        '<td>' + escapeHtml(record.action || '') + '</td>' +
        '<td>' + escapeHtml(record.status || '') + '</td>' +
        '<td>' + escapeHtml(record.durationMs || 0) + ' ms</td>' +
        '<td>' + escapeHtml(record.requestBytes || 0) + '</td>' +
        '<td>' + escapeHtml(record.responseBytes || 0) + '</td>' +
      '</tr>';
    }).join('');
    var selected = selectedBridgeCallRecord();
    return '<div class="devtools-pane-grid bridge">' +
      '<section class="devtools-pane"><table class="devtools-table"><thead><tr><th>Time</th><th>Bridge action</th><th>Result</th><th>Duration</th><th>In</th><th>Out</th></tr></thead><tbody>' + rows + '</tbody></table></section>' +
      '<section class="devtools-pane devtools-sidebar-stack">' +
        '<section class="devtools-section"><h3>Payload</h3><pre class="devtools-json">' + json(selected ? selected.payload : {}) + '</pre></section>' +
        '<section class="devtools-section"><h3>Response</h3><pre class="devtools-json">' + json(selected ? selected.response : {}) + '</pre></section>' +
        '<section class="devtools-section"><h3>Timing</h3><pre class="devtools-json">' + json(selected ? selected.timing : {}) + '</pre></section>' +
      '</section>' +
    '</div>';
  }

  function renderProfiler() {
    var profile = data.profiler || {};
    return '<section class="devtools-profiler">' +
      '<div class="devtools-toolbar">' +
        '<button data-action="profiler" data-command="startCpu">Start CPU</button>' +
        '<button data-action="profiler" data-command="stopCpu">Stop CPU</button>' +
        '<button data-action="profiler" data-command="heapSnapshot">Heap Snapshot</button>' +
      '</div>' +
      '<div class="devtools-metric-grid">' +
        metric('CPU samples', profile.cpuSamples || 0) +
        metric('Heap used', profile.heapUsed || '0 MB') +
        metric('Objects', profile.objectCount || 0) +
        metric('Last profile', profile.lastProfile || 'None') +
      '</div>' +
      '<section class="devtools-section"><h3>Summary</h3><pre class="devtools-json">' + json(profile.summary || {}) + '</pre></section>' +
    '</section>';
  }

  function renderRenderStats() {
    var stats = data.render || {};
    return '<section class="devtools-render">' +
      '<div class="devtools-toolbar"><button data-action="refresh">Refresh</button><button data-action="render-command" data-command="snapshot">Snapshot</button></div>' +
      '<div class="devtools-metric-grid">' +
        metric('Frame time', stats.frameMs ? stats.frameMs + ' ms' : '0 ms') +
        metric('Layout', stats.layoutMs ? stats.layoutMs + ' ms' : '0 ms') +
        metric('Paint', stats.paintMs ? stats.paintMs + ' ms' : '0 ms') +
        metric('Display items', stats.displayItems || 0) +
        metric('Invalidations', stats.invalidations || 0) +
        metric('Texture bytes', stats.textureBytes || 0) +
      '</div>' +
      '<section class="devtools-section"><h3>Frame Detail</h3><pre class="devtools-json">' + json(stats.detail || {}) + '</pre></section>' +
    '</section>';
  }

  function metric(label, value) {
    return '<div class="devtools-metric"><div class="devtools-metric-label">' + escapeHtml(label) + '</div><div class="devtools-metric-value">' + escapeHtml(value) + '</div></div>';
  }

  function bindEvents() {
    root.querySelectorAll('[data-action="dock"]').forEach(function (button) {
      button.addEventListener('pointerdown', function (event) {
        var dock = event.currentTarget.getAttribute('data-dock');
        state.dock = dock;
        if (dock === 'floating') {
          requestHostMode('window');
          return;
        }
        requestHostMode('viewport');
      });
    });
    var targetSelect = root.querySelector('[data-action="target"]');
    if (targetSelect) {
      targetSelect.addEventListener('change', function (event) {
        state.selectedTargetId = event.currentTarget.value;
        attachSelectedTarget();
      });
    }
    root.querySelectorAll('[data-action="tab"]').forEach(function (button) {
      button.addEventListener('pointerdown', function (event) {
        state.activeTab = event.currentTarget.getAttribute('data-tab');
        render();
      });
    });
    var collapse = root.querySelector('[data-action="collapse"]');
    if (collapse) {
      collapse.addEventListener('pointerdown', function () {
        state.collapsed = !state.collapsed;
        render();
      });
    }
    var close = root.querySelector('[data-action="close"]');
    if (close) {
      close.addEventListener('pointerdown', function () {
        state.collapsed = true;
        render();
      });
    }
    root.querySelectorAll('.devtools-tree-row[data-node-id]').forEach(function (row) {
      row.addEventListener('pointerdown', onNodePointerDown);
      row.addEventListener('pointerenter', onNodePointerEnter);
      row.addEventListener('pointerleave', onNodePointerLeave);
    });
    root.querySelectorAll('[data-source-id]').forEach(function (row) {
      row.addEventListener('pointerdown', function (event) {
        state.selectedScriptId = event.currentTarget.getAttribute('data-source-id');
        render();
      });
    });
    root.querySelectorAll('[data-bridge-call-id]').forEach(function (row) {
      row.addEventListener('pointerdown', function (event) {
        state.selectedBridgeCallId = event.currentTarget.getAttribute('data-bridge-call-id');
        render();
      });
    });
    var form = root.querySelector('[data-action="evaluate"]');
    if (form) {
      form.addEventListener('submit', onEvaluate);
    }
    root.querySelectorAll('[data-action="debugger"], [data-action="profiler"], [data-action="render-command"]').forEach(function (button) {
      button.addEventListener('pointerdown', function (event) {
        var action = event.currentTarget.getAttribute('data-action');
        var command = event.currentTarget.getAttribute('data-command');
        bridgeCall('devtools.' + action + '_command', { targetId: state.selectedTargetId, command: command })
          .catch(function () { return {}; })
          .then(refreshAllPanels);
      });
    });
    var refresh = root.querySelector('[data-action="refresh"]');
    if (refresh) refresh.addEventListener('pointerdown', refreshAllPanels);
    root.querySelectorAll('[data-resize]').forEach(function (handle) {
      handle.addEventListener('pointerdown', beginResize);
    });
    var titlebar = root.querySelector('[data-drag="titlebar"]');
    if (titlebar) {
      titlebar.addEventListener('pointerdown', beginDrag);
    }
  }

  function onNodePointerDown(event) {
    var toggle = event.target.closest('[data-action="toggle-node"]');
    var nodeId = event.currentTarget.getAttribute('data-node-id');
    if (toggle) {
      state.expandedNodes[nodeId] = state.expandedNodes[nodeId] !== true;
      render();
      return;
    }
    state.selectedNodeId = nodeId;
    refreshSelectedNodeStyles();
  }

  function onNodePointerEnter(event) {
    var nodeId = event.currentTarget.getAttribute('data-node-id');
    bridgeCall('devtools.highlight_node', { targetId: state.selectedTargetId, nodeId: nodeId });
  }

  function onNodePointerLeave() {
    bridgeCall('devtools.clear_highlight', { targetId: state.selectedTargetId });
  }

  function onEvaluate(event) {
    event.preventDefault();
    var input = root.querySelector('[data-console-input]');
    var expression = input ? input.value : '';
    state.consoleInput = expression;
    if (!expression.trim()) return;
    bridgeCall('devtools.evaluate', {
      targetId: state.selectedTargetId,
      expression: expression,
    }).then(function (response) {
      data.console.push({
        method: 'result',
        message: response && response.result !== undefined ? String(response.result) : '',
        source: 'Runtime.evaluate',
      });
      state.consoleInput = '';
      render();
    }).catch(function (error) {
      data.console.push({
        method: 'error',
        message: error && error.message ? error.message : String(error),
        source: 'Runtime.evaluate',
      });
      render();
    });
  }

  function beginDrag(event) {
    if (state.dock !== 'floating' || event.target.closest('button,select,input')) {
      return;
    }
    dragState = {
      type: 'move',
      startX: event.clientX,
      startY: event.clientY,
      rect: Object.assign({}, state.floating),
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', endPointerDrag);
  }

  function beginResize(event) {
    event.preventDefault();
    dragState = {
      type: 'resize',
      edge: event.currentTarget.getAttribute('data-resize'),
      startX: event.clientX,
      startY: event.clientY,
      width: state.width,
      height: state.height,
      rect: Object.assign({}, state.floating),
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', endPointerDrag);
  }

  function onPointerMove(event) {
    if (!dragState) return;
    var dx = event.clientX - dragState.startX;
    var dy = event.clientY - dragState.startY;
    if (dragState.type === 'move') {
      state.floating.x = dragState.rect.x + dx;
      state.floating.y = dragState.rect.y + dy;
    } else if (state.dock === 'right') {
      state.width = clamp(dragState.width - dx, 360, window.innerWidth - 80);
    } else if (state.dock === 'left') {
      state.width = clamp(dragState.width + dx, 360, window.innerWidth - 80);
    } else if (state.dock === 'bottom') {
      state.height = clamp(dragState.height - dy, 260, window.innerHeight - 80);
    } else {
      state.floating.width = clamp(dragState.rect.width + dx, 360, window.innerWidth - 24);
      state.floating.height = clamp(dragState.rect.height + dy, 260, window.innerHeight - 24);
    }
    render();
  }

  function endPointerDrag() {
    dragState = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', endPointerDrag);
  }

  function mockCall(action, payload) {
    var sample = sampleData();
    if (action === 'devtools.list_targets') return { targets: sample.targets };
    if (action === 'devtools.attach_target') return { attached: true, targetId: payload.targetId };
    if (action === 'devtools.get_dom') return { root: sample.dom };
    if (action === 'devtools.get_node_styles') return sample.styles[payload.nodeId] || sample.defaultStyles;
    if (action === 'devtools.get_console') return { entries: sample.console };
    if (action === 'devtools.evaluate') return { result: 'Sample result for ' + payload.expression };
    if (action === 'devtools.get_scripts') return { scripts: sample.scripts };
    if (action === 'devtools.get_bridge_calls') return { records: sample.bridgeCalls };
    if (action === 'devtools.get_render_stats') return sample.render;
    if (action === 'devtools.get_profiler_summary') return sample.profiler;
    if (action === 'devtools.set_host_mode') return { mode: payload.mode === 'window' ? 'window' : 'viewport' };
    return {};
  }

  function seedSampleData() {
    var sample = sampleData();
    data.targets = sample.targets;
    data.dom = sample.dom;
    data.styles = sample.defaultStyles;
    data.console = sample.console;
    data.scripts = sample.scripts;
    data.bridgeCalls = sample.bridgeCalls;
    data.profiler = sample.profiler;
    data.render = sample.render;
    data.attached = true;
    if (!state.selectedTargetId && data.targets.length > 0) {
      state.selectedTargetId = data.targets[0].id;
    }
    if (!state.selectedNodeId && data.dom) {
      state.selectedNodeId = data.dom.id;
      state.expandedNodes[data.dom.id] = true;
    }
    if (!state.selectedScriptId && data.scripts.length > 0) {
      state.selectedScriptId = data.scripts[0].id;
    }
    if (!state.selectedBridgeCallId && data.bridgeCalls.length > 0) {
      state.selectedBridgeCallId = data.bridgeCalls[0].id;
    }
  }

  function sampleData() {
    return {
      targets: [
        { id: 'view-main', title: 'Campaign HUD', entryPoint: 'ui://foae/index.html', readyState: 'ready', attached: true },
        { id: 'view-menu', title: 'Main Menu', entryPoint: 'ui://foae/index.html?mode=mainmenu', readyState: 'ready', attached: false },
      ],
      dom: {
        id: 'node-1',
        name: 'body',
        attributes: { class: 'app ingame' },
        children: [
          {
            id: 'node-2',
            name: 'div',
            attributes: { id: 'root' },
            children: [
              {
                id: 'node-3',
                name: 'aside',
                attributes: { class: 'screen-shell left-sidebar' },
                children: [
                  { id: 'node-4', name: 'button', attributes: { class: 'game-button primary' }, children: [] },
                  { id: 'node-5', name: 'section', attributes: { class: 'settlement-summary' }, children: [] },
                ],
              },
              {
                id: 'node-6',
                name: 'main',
                attributes: { class: 'world-overlay' },
                children: [
                  { id: 'node-7', name: 'div', attributes: { class: 'notification-stack' }, children: [] },
                ],
              },
            ],
          },
        ],
      },
      defaultStyles: {
        matched: [
          { selector: '.screen-shell', properties: [{ name: 'display', value: 'flex' }, { name: 'background', value: '#15191d' }] },
        ],
        computed: { display: 'flex', position: 'relative', width: '420px', height: '100%' },
        box: { margin: '0', border: '1px', width: '420', height: '1080' },
      },
      styles: {
        'node-4': {
          matched: [
            { selector: '.game-button.primary', properties: [{ name: 'background', value: '#5b2632' }, { name: 'color', value: '#f0d28d' }] },
          ],
          computed: { display: 'inline-flex', height: '32px', padding: '0 12px' },
          box: { margin: '4', border: '1', width: '128', height: '32' },
        },
      },
      console: [
        { method: 'log', message: 'Scripting ready', source: 'main.tsx', line: 1120 },
        { method: 'warn', message: 'Slow layout pass: 19.4 ms', source: 'layout', line: 0 },
      ],
      scripts: [
        {
          id: 'source-main',
          path: 'WebUI/src/main.tsx',
          content: 'function start() {\n  engine.call("ScriptingReady");\n}\n\nstart();',
          callStack: ['start', 'module evaluation'],
          scopes: { local: {}, global: { engine: 'runtimeEngine' } },
        },
        {
          id: 'source-app',
          path: 'WebUI/src/App.tsx',
          content: 'export function App() {\n  return <GameProvider />;\n}',
          callStack: [],
          scopes: {},
        },
      ],
      bridgeCalls: [
        {
          id: 'net-1',
          time: '12:04:18',
          action: 'game.get_game_state',
          status: 'ok',
          durationMs: 2.3,
          requestBytes: 34,
          responseBytes: 891,
          payload: {},
          response: { date: '450-03-01', speed: 1 },
          timing: { queuedMs: 0.1, executeMs: 1.7, serialiseMs: 0.5 },
        },
        {
          id: 'net-2',
          time: '12:04:20',
          action: 'game.get_faction_data',
          status: 'ok',
          durationMs: 4.8,
          requestBytes: 61,
          responseBytes: 3240,
          payload: { factionId: 'western_empire', scope: 'full' },
          response: { factionId: 'western_empire' },
          timing: { queuedMs: 0.2, executeMs: 3.8, serialiseMs: 0.8 },
        },
      ],
      profiler: {
        cpuSamples: 1284,
        heapUsed: '42 MB',
        objectCount: 18420,
        lastProfile: 'None',
        summary: { topFunction: 'renderScreen', selfMs: 3.2, totalMs: 8.7 },
      },
      render: {
        frameMs: 6.4,
        layoutMs: 1.8,
        paintMs: 2.1,
        displayItems: 924,
        invalidations: 12,
        textureBytes: 37748736,
        detail: {
          view: 'Campaign HUD',
          taffyNodes: 318,
          paragraphs: 42,
          paintCommands: 924,
        },
      },
    };
  }

  installEngineEvents();
  if (!engine()) {
    seedSampleData();
  }
  render();
  refreshTargets().then(render).catch(function (error) {
    data.error = error && error.message ? error.message : String(error);
    render();
  });
  window.addEventListener('resize', render);
})();
