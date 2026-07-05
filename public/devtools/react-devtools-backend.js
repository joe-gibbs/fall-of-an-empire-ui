(function() {
	//#region \0rolldown/runtime.js
	var __commonJSMin = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
	//#endregion
	//#region ../../../../Documents/Unreal Projects/fall-of-an-empire/WebUI/node_modules/react/cjs/react.production.js
	/**
	* @license React
	* react.production.js
	*
	* Copyright (c) Meta Platforms, Inc. and affiliates.
	*
	* This source code is licensed under the MIT license found in the
	* LICENSE file in the root directory of this source tree.
	*/
	var require_react_production = /* @__PURE__ */ __commonJSMin(((exports) => {
		var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
		function getIteratorFn(maybeIterable) {
			if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
			maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
			return "function" === typeof maybeIterable ? maybeIterable : null;
		}
		var ReactNoopUpdateQueue = {
			isMounted: function() {
				return !1;
			},
			enqueueForceUpdate: function() {},
			enqueueReplaceState: function() {},
			enqueueSetState: function() {}
		}, assign = Object.assign, emptyObject = {};
		function Component(props, context, updater) {
			this.props = props;
			this.context = context;
			this.refs = emptyObject;
			this.updater = updater || ReactNoopUpdateQueue;
		}
		Component.prototype.isReactComponent = {};
		Component.prototype.setState = function(partialState, callback) {
			if ("object" !== typeof partialState && "function" !== typeof partialState && null != partialState) throw Error("takes an object of state variables to update or a function which returns an object of state variables.");
			this.updater.enqueueSetState(this, partialState, callback, "setState");
		};
		Component.prototype.forceUpdate = function(callback) {
			this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
		};
		function ComponentDummy() {}
		ComponentDummy.prototype = Component.prototype;
		function PureComponent(props, context, updater) {
			this.props = props;
			this.context = context;
			this.refs = emptyObject;
			this.updater = updater || ReactNoopUpdateQueue;
		}
		var pureComponentPrototype = PureComponent.prototype = new ComponentDummy();
		pureComponentPrototype.constructor = PureComponent;
		assign(pureComponentPrototype, Component.prototype);
		pureComponentPrototype.isPureReactComponent = !0;
		var isArrayImpl = Array.isArray;
		function noop() {}
		var ReactSharedInternals = {
			H: null,
			A: null,
			T: null,
			S: null
		}, hasOwnProperty = Object.prototype.hasOwnProperty;
		function ReactElement(type, key, props) {
			var refProp = props.ref;
			return {
				$$typeof: REACT_ELEMENT_TYPE,
				type,
				key,
				ref: void 0 !== refProp ? refProp : null,
				props
			};
		}
		function cloneAndReplaceKey(oldElement, newKey) {
			return ReactElement(oldElement.type, newKey, oldElement.props);
		}
		function isValidElement(object) {
			return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
		}
		function escape(key) {
			var escaperLookup = {
				"=": "=0",
				":": "=2"
			};
			return "$" + key.replace(/[=:]/g, function(match) {
				return escaperLookup[match];
			});
		}
		var userProvidedKeyEscapeRegex = /\/+/g;
		function getElementKey(element, index) {
			return "object" === typeof element && null !== element && null != element.key ? escape("" + element.key) : index.toString(36);
		}
		function resolveThenable(thenable) {
			switch (thenable.status) {
				case "fulfilled": return thenable.value;
				case "rejected": throw thenable.reason;
				default: switch ("string" === typeof thenable.status ? thenable.then(noop, noop) : (thenable.status = "pending", thenable.then(function(fulfilledValue) {
					"pending" === thenable.status && (thenable.status = "fulfilled", thenable.value = fulfilledValue);
				}, function(error) {
					"pending" === thenable.status && (thenable.status = "rejected", thenable.reason = error);
				})), thenable.status) {
					case "fulfilled": return thenable.value;
					case "rejected": throw thenable.reason;
				}
			}
			throw thenable;
		}
		function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
			var type = typeof children;
			if ("undefined" === type || "boolean" === type) children = null;
			var invokeCallback = !1;
			if (null === children) invokeCallback = !0;
			else switch (type) {
				case "bigint":
				case "string":
				case "number":
					invokeCallback = !0;
					break;
				case "object": switch (children.$$typeof) {
					case REACT_ELEMENT_TYPE:
					case REACT_PORTAL_TYPE:
						invokeCallback = !0;
						break;
					case REACT_LAZY_TYPE: return invokeCallback = children._init, mapIntoArray(invokeCallback(children._payload), array, escapedPrefix, nameSoFar, callback);
				}
			}
			if (invokeCallback) return callback = callback(children), invokeCallback = "" === nameSoFar ? "." + getElementKey(children, 0) : nameSoFar, isArrayImpl(callback) ? (escapedPrefix = "", null != invokeCallback && (escapedPrefix = invokeCallback.replace(userProvidedKeyEscapeRegex, "$&/") + "/"), mapIntoArray(callback, array, escapedPrefix, "", function(c) {
				return c;
			})) : null != callback && (isValidElement(callback) && (callback = cloneAndReplaceKey(callback, escapedPrefix + (null == callback.key || children && children.key === callback.key ? "" : ("" + callback.key).replace(userProvidedKeyEscapeRegex, "$&/") + "/") + invokeCallback)), array.push(callback)), 1;
			invokeCallback = 0;
			var nextNamePrefix = "" === nameSoFar ? "." : nameSoFar + ":";
			if (isArrayImpl(children)) for (var i = 0; i < children.length; i++) nameSoFar = children[i], type = nextNamePrefix + getElementKey(nameSoFar, i), invokeCallback += mapIntoArray(nameSoFar, array, escapedPrefix, type, callback);
			else if (i = getIteratorFn(children), "function" === typeof i) for (children = i.call(children), i = 0; !(nameSoFar = children.next()).done;) nameSoFar = nameSoFar.value, type = nextNamePrefix + getElementKey(nameSoFar, i++), invokeCallback += mapIntoArray(nameSoFar, array, escapedPrefix, type, callback);
			else if ("object" === type) {
				if ("function" === typeof children.then) return mapIntoArray(resolveThenable(children), array, escapedPrefix, nameSoFar, callback);
				array = String(children);
				throw Error("Objects are not valid as a React child (found: " + ("[object Object]" === array ? "object with keys {" + Object.keys(children).join(", ") + "}" : array) + "). If you meant to render a collection of children, use an array instead.");
			}
			return invokeCallback;
		}
		function mapChildren(children, func, context) {
			if (null == children) return children;
			var result = [], count = 0;
			mapIntoArray(children, result, "", "", function(child) {
				return func.call(context, child, count++);
			});
			return result;
		}
		function lazyInitializer(payload) {
			if (-1 === payload._status) {
				var ctor = payload._result;
				ctor = ctor();
				ctor.then(function(moduleObject) {
					if (0 === payload._status || -1 === payload._status) payload._status = 1, payload._result = moduleObject;
				}, function(error) {
					if (0 === payload._status || -1 === payload._status) payload._status = 2, payload._result = error;
				});
				-1 === payload._status && (payload._status = 0, payload._result = ctor);
			}
			if (1 === payload._status) return payload._result.default;
			throw payload._result;
		}
		var reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
			if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
				var event = new window.ErrorEvent("error", {
					bubbles: !0,
					cancelable: !0,
					message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
					error
				});
				if (!window.dispatchEvent(event)) return;
			} else if ("object" === typeof process && "function" === typeof process.emit) {
				process.emit("uncaughtException", error);
				return;
			}
			console.error(error);
		}, Children = {
			map: mapChildren,
			forEach: function(children, forEachFunc, forEachContext) {
				mapChildren(children, function() {
					forEachFunc.apply(this, arguments);
				}, forEachContext);
			},
			count: function(children) {
				var n = 0;
				mapChildren(children, function() {
					n++;
				});
				return n;
			},
			toArray: function(children) {
				return mapChildren(children, function(child) {
					return child;
				}) || [];
			},
			only: function(children) {
				if (!isValidElement(children)) throw Error("React.Children.only expected to receive a single React element child.");
				return children;
			}
		};
		exports.Activity = REACT_ACTIVITY_TYPE;
		exports.Children = Children;
		exports.Component = Component;
		exports.Fragment = REACT_FRAGMENT_TYPE;
		exports.Profiler = REACT_PROFILER_TYPE;
		exports.PureComponent = PureComponent;
		exports.StrictMode = REACT_STRICT_MODE_TYPE;
		exports.Suspense = REACT_SUSPENSE_TYPE;
		exports.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ReactSharedInternals;
		exports.__COMPILER_RUNTIME = {
			__proto__: null,
			c: function(size) {
				return ReactSharedInternals.H.useMemoCache(size);
			}
		};
		exports.cache = function(fn) {
			return function() {
				return fn.apply(null, arguments);
			};
		};
		exports.cacheSignal = function() {
			return null;
		};
		exports.cloneElement = function(element, config, children) {
			if (null === element || void 0 === element) throw Error("The argument must be a React element, but you passed " + element + ".");
			var props = assign({}, element.props), key = element.key;
			if (null != config) for (propName in void 0 !== config.key && (key = "" + config.key), config) !hasOwnProperty.call(config, propName) || "key" === propName || "__self" === propName || "__source" === propName || "ref" === propName && void 0 === config.ref || (props[propName] = config[propName]);
			var propName = arguments.length - 2;
			if (1 === propName) props.children = children;
			else if (1 < propName) {
				for (var childArray = Array(propName), i = 0; i < propName; i++) childArray[i] = arguments[i + 2];
				props.children = childArray;
			}
			return ReactElement(element.type, key, props);
		};
		exports.createContext = function(defaultValue) {
			defaultValue = {
				$$typeof: REACT_CONTEXT_TYPE,
				_currentValue: defaultValue,
				_currentValue2: defaultValue,
				_threadCount: 0,
				Provider: null,
				Consumer: null
			};
			defaultValue.Provider = defaultValue;
			defaultValue.Consumer = {
				$$typeof: REACT_CONSUMER_TYPE,
				_context: defaultValue
			};
			return defaultValue;
		};
		exports.createElement = function(type, config, children) {
			var propName, props = {}, key = null;
			if (null != config) for (propName in void 0 !== config.key && (key = "" + config.key), config) hasOwnProperty.call(config, propName) && "key" !== propName && "__self" !== propName && "__source" !== propName && (props[propName] = config[propName]);
			var childrenLength = arguments.length - 2;
			if (1 === childrenLength) props.children = children;
			else if (1 < childrenLength) {
				for (var childArray = Array(childrenLength), i = 0; i < childrenLength; i++) childArray[i] = arguments[i + 2];
				props.children = childArray;
			}
			if (type && type.defaultProps) for (propName in childrenLength = type.defaultProps, childrenLength) void 0 === props[propName] && (props[propName] = childrenLength[propName]);
			return ReactElement(type, key, props);
		};
		exports.createRef = function() {
			return { current: null };
		};
		exports.forwardRef = function(render) {
			return {
				$$typeof: REACT_FORWARD_REF_TYPE,
				render
			};
		};
		exports.isValidElement = isValidElement;
		exports.lazy = function(ctor) {
			return {
				$$typeof: REACT_LAZY_TYPE,
				_payload: {
					_status: -1,
					_result: ctor
				},
				_init: lazyInitializer
			};
		};
		exports.memo = function(type, compare) {
			return {
				$$typeof: REACT_MEMO_TYPE,
				type,
				compare: void 0 === compare ? null : compare
			};
		};
		exports.startTransition = function(scope) {
			var prevTransition = ReactSharedInternals.T, currentTransition = {};
			ReactSharedInternals.T = currentTransition;
			try {
				var returnValue = scope(), onStartTransitionFinish = ReactSharedInternals.S;
				null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
				"object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && returnValue.then(noop, reportGlobalError);
			} catch (error) {
				reportGlobalError(error);
			} finally {
				null !== prevTransition && null !== currentTransition.types && (prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
			}
		};
		exports.unstable_useCacheRefresh = function() {
			return ReactSharedInternals.H.useCacheRefresh();
		};
		exports.use = function(usable) {
			return ReactSharedInternals.H.use(usable);
		};
		exports.useActionState = function(action, initialState, permalink) {
			return ReactSharedInternals.H.useActionState(action, initialState, permalink);
		};
		exports.useCallback = function(callback, deps) {
			return ReactSharedInternals.H.useCallback(callback, deps);
		};
		exports.useContext = function(Context) {
			return ReactSharedInternals.H.useContext(Context);
		};
		exports.useDebugValue = function() {};
		exports.useDeferredValue = function(value, initialValue) {
			return ReactSharedInternals.H.useDeferredValue(value, initialValue);
		};
		exports.useEffect = function(create, deps) {
			return ReactSharedInternals.H.useEffect(create, deps);
		};
		exports.useEffectEvent = function(callback) {
			return ReactSharedInternals.H.useEffectEvent(callback);
		};
		exports.useId = function() {
			return ReactSharedInternals.H.useId();
		};
		exports.useImperativeHandle = function(ref, create, deps) {
			return ReactSharedInternals.H.useImperativeHandle(ref, create, deps);
		};
		exports.useInsertionEffect = function(create, deps) {
			return ReactSharedInternals.H.useInsertionEffect(create, deps);
		};
		exports.useLayoutEffect = function(create, deps) {
			return ReactSharedInternals.H.useLayoutEffect(create, deps);
		};
		exports.useMemo = function(create, deps) {
			return ReactSharedInternals.H.useMemo(create, deps);
		};
		exports.useOptimistic = function(passthrough, reducer) {
			return ReactSharedInternals.H.useOptimistic(passthrough, reducer);
		};
		exports.useReducer = function(reducer, initialArg, init) {
			return ReactSharedInternals.H.useReducer(reducer, initialArg, init);
		};
		exports.useRef = function(initialValue) {
			return ReactSharedInternals.H.useRef(initialValue);
		};
		exports.useState = function(initialState) {
			return ReactSharedInternals.H.useState(initialState);
		};
		exports.useSyncExternalStore = function(subscribe, getSnapshot, getServerSnapshot) {
			return ReactSharedInternals.H.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
		};
		exports.useTransition = function() {
			return ReactSharedInternals.H.useTransition();
		};
		exports.version = "19.2.4";
	}));
	//#endregion
	//#region ../../../../Documents/Unreal Projects/fall-of-an-empire/WebUI/node_modules/react/cjs/react.development.js
	/**
	* @license React
	* react.development.js
	*
	* Copyright (c) Meta Platforms, Inc. and affiliates.
	*
	* This source code is licensed under the MIT license found in the
	* LICENSE file in the root directory of this source tree.
	*/
	var require_react_development = /* @__PURE__ */ __commonJSMin(((exports, module) => {
		"production" !== process.env.NODE_ENV && (function() {
			function defineDeprecationWarning(methodName, info) {
				Object.defineProperty(Component.prototype, methodName, { get: function() {
					console.warn("%s(...) is deprecated in plain JavaScript React classes. %s", info[0], info[1]);
				} });
			}
			function getIteratorFn(maybeIterable) {
				if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
				maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
				return "function" === typeof maybeIterable ? maybeIterable : null;
			}
			function warnNoop(publicInstance, callerName) {
				publicInstance = (publicInstance = publicInstance.constructor) && (publicInstance.displayName || publicInstance.name) || "ReactClass";
				var warningKey = publicInstance + "." + callerName;
				didWarnStateUpdateForUnmountedComponent[warningKey] || (console.error("Can't call %s on a component that is not yet mounted. This is a no-op, but it might indicate a bug in your application. Instead, assign to `this.state` directly or define a `state = {};` class property with the desired state in the %s component.", callerName, publicInstance), didWarnStateUpdateForUnmountedComponent[warningKey] = !0);
			}
			function Component(props, context, updater) {
				this.props = props;
				this.context = context;
				this.refs = emptyObject;
				this.updater = updater || ReactNoopUpdateQueue;
			}
			function ComponentDummy() {}
			function PureComponent(props, context, updater) {
				this.props = props;
				this.context = context;
				this.refs = emptyObject;
				this.updater = updater || ReactNoopUpdateQueue;
			}
			function noop() {}
			function testStringCoercion(value) {
				return "" + value;
			}
			function checkKeyStringCoercion(value) {
				try {
					testStringCoercion(value);
					var JSCompiler_inline_result = !1;
				} catch (e) {
					JSCompiler_inline_result = !0;
				}
				if (JSCompiler_inline_result) {
					JSCompiler_inline_result = console;
					var JSCompiler_temp_const = JSCompiler_inline_result.error;
					var JSCompiler_inline_result$jscomp$0 = "function" === typeof Symbol && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
					JSCompiler_temp_const.call(JSCompiler_inline_result, "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.", JSCompiler_inline_result$jscomp$0);
					return testStringCoercion(value);
				}
			}
			function getComponentNameFromType(type) {
				if (null == type) return null;
				if ("function" === typeof type) return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
				if ("string" === typeof type) return type;
				switch (type) {
					case REACT_FRAGMENT_TYPE: return "Fragment";
					case REACT_PROFILER_TYPE: return "Profiler";
					case REACT_STRICT_MODE_TYPE: return "StrictMode";
					case REACT_SUSPENSE_TYPE: return "Suspense";
					case REACT_SUSPENSE_LIST_TYPE: return "SuspenseList";
					case REACT_ACTIVITY_TYPE: return "Activity";
				}
				if ("object" === typeof type) switch ("number" === typeof type.tag && console.error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."), type.$$typeof) {
					case REACT_PORTAL_TYPE: return "Portal";
					case REACT_CONTEXT_TYPE: return type.displayName || "Context";
					case REACT_CONSUMER_TYPE: return (type._context.displayName || "Context") + ".Consumer";
					case REACT_FORWARD_REF_TYPE:
						var innerType = type.render;
						type = type.displayName;
						type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
						return type;
					case REACT_MEMO_TYPE: return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
					case REACT_LAZY_TYPE:
						innerType = type._payload;
						type = type._init;
						try {
							return getComponentNameFromType(type(innerType));
						} catch (x) {}
				}
				return null;
			}
			function getTaskName(type) {
				if (type === REACT_FRAGMENT_TYPE) return "<>";
				if ("object" === typeof type && null !== type && type.$$typeof === REACT_LAZY_TYPE) return "<...>";
				try {
					var name = getComponentNameFromType(type);
					return name ? "<" + name + ">" : "<...>";
				} catch (x) {
					return "<...>";
				}
			}
			function getOwner() {
				var dispatcher = ReactSharedInternals.A;
				return null === dispatcher ? null : dispatcher.getOwner();
			}
			function UnknownOwner() {
				return Error("react-stack-top-frame");
			}
			function hasValidKey(config) {
				if (hasOwnProperty.call(config, "key")) {
					var getter = Object.getOwnPropertyDescriptor(config, "key").get;
					if (getter && getter.isReactWarning) return !1;
				}
				return void 0 !== config.key;
			}
			function defineKeyPropWarningGetter(props, displayName) {
				function warnAboutAccessingKey() {
					specialPropKeyWarningShown || (specialPropKeyWarningShown = !0, console.error("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)", displayName));
				}
				warnAboutAccessingKey.isReactWarning = !0;
				Object.defineProperty(props, "key", {
					get: warnAboutAccessingKey,
					configurable: !0
				});
			}
			function elementRefGetterWithDeprecationWarning() {
				var componentName = getComponentNameFromType(this.type);
				didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = !0, console.error("Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."));
				componentName = this.props.ref;
				return void 0 !== componentName ? componentName : null;
			}
			function ReactElement(type, key, props, owner, debugStack, debugTask) {
				var refProp = props.ref;
				type = {
					$$typeof: REACT_ELEMENT_TYPE,
					type,
					key,
					props,
					_owner: owner
				};
				null !== (void 0 !== refProp ? refProp : null) ? Object.defineProperty(type, "ref", {
					enumerable: !1,
					get: elementRefGetterWithDeprecationWarning
				}) : Object.defineProperty(type, "ref", {
					enumerable: !1,
					value: null
				});
				type._store = {};
				Object.defineProperty(type._store, "validated", {
					configurable: !1,
					enumerable: !1,
					writable: !0,
					value: 0
				});
				Object.defineProperty(type, "_debugInfo", {
					configurable: !1,
					enumerable: !1,
					writable: !0,
					value: null
				});
				Object.defineProperty(type, "_debugStack", {
					configurable: !1,
					enumerable: !1,
					writable: !0,
					value: debugStack
				});
				Object.defineProperty(type, "_debugTask", {
					configurable: !1,
					enumerable: !1,
					writable: !0,
					value: debugTask
				});
				Object.freeze && (Object.freeze(type.props), Object.freeze(type));
				return type;
			}
			function cloneAndReplaceKey(oldElement, newKey) {
				newKey = ReactElement(oldElement.type, newKey, oldElement.props, oldElement._owner, oldElement._debugStack, oldElement._debugTask);
				oldElement._store && (newKey._store.validated = oldElement._store.validated);
				return newKey;
			}
			function validateChildKeys(node) {
				isValidElement(node) ? node._store && (node._store.validated = 1) : "object" === typeof node && null !== node && node.$$typeof === REACT_LAZY_TYPE && ("fulfilled" === node._payload.status ? isValidElement(node._payload.value) && node._payload.value._store && (node._payload.value._store.validated = 1) : node._store && (node._store.validated = 1));
			}
			function isValidElement(object) {
				return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
			}
			function escape(key) {
				var escaperLookup = {
					"=": "=0",
					":": "=2"
				};
				return "$" + key.replace(/[=:]/g, function(match) {
					return escaperLookup[match];
				});
			}
			function getElementKey(element, index) {
				return "object" === typeof element && null !== element && null != element.key ? (checkKeyStringCoercion(element.key), escape("" + element.key)) : index.toString(36);
			}
			function resolveThenable(thenable) {
				switch (thenable.status) {
					case "fulfilled": return thenable.value;
					case "rejected": throw thenable.reason;
					default: switch ("string" === typeof thenable.status ? thenable.then(noop, noop) : (thenable.status = "pending", thenable.then(function(fulfilledValue) {
						"pending" === thenable.status && (thenable.status = "fulfilled", thenable.value = fulfilledValue);
					}, function(error) {
						"pending" === thenable.status && (thenable.status = "rejected", thenable.reason = error);
					})), thenable.status) {
						case "fulfilled": return thenable.value;
						case "rejected": throw thenable.reason;
					}
				}
				throw thenable;
			}
			function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
				var type = typeof children;
				if ("undefined" === type || "boolean" === type) children = null;
				var invokeCallback = !1;
				if (null === children) invokeCallback = !0;
				else switch (type) {
					case "bigint":
					case "string":
					case "number":
						invokeCallback = !0;
						break;
					case "object": switch (children.$$typeof) {
						case REACT_ELEMENT_TYPE:
						case REACT_PORTAL_TYPE:
							invokeCallback = !0;
							break;
						case REACT_LAZY_TYPE: return invokeCallback = children._init, mapIntoArray(invokeCallback(children._payload), array, escapedPrefix, nameSoFar, callback);
					}
				}
				if (invokeCallback) {
					invokeCallback = children;
					callback = callback(invokeCallback);
					var childKey = "" === nameSoFar ? "." + getElementKey(invokeCallback, 0) : nameSoFar;
					isArrayImpl(callback) ? (escapedPrefix = "", null != childKey && (escapedPrefix = childKey.replace(userProvidedKeyEscapeRegex, "$&/") + "/"), mapIntoArray(callback, array, escapedPrefix, "", function(c) {
						return c;
					})) : null != callback && (isValidElement(callback) && (null != callback.key && (invokeCallback && invokeCallback.key === callback.key || checkKeyStringCoercion(callback.key)), escapedPrefix = cloneAndReplaceKey(callback, escapedPrefix + (null == callback.key || invokeCallback && invokeCallback.key === callback.key ? "" : ("" + callback.key).replace(userProvidedKeyEscapeRegex, "$&/") + "/") + childKey), "" !== nameSoFar && null != invokeCallback && isValidElement(invokeCallback) && null == invokeCallback.key && invokeCallback._store && !invokeCallback._store.validated && (escapedPrefix._store.validated = 2), callback = escapedPrefix), array.push(callback));
					return 1;
				}
				invokeCallback = 0;
				childKey = "" === nameSoFar ? "." : nameSoFar + ":";
				if (isArrayImpl(children)) for (var i = 0; i < children.length; i++) nameSoFar = children[i], type = childKey + getElementKey(nameSoFar, i), invokeCallback += mapIntoArray(nameSoFar, array, escapedPrefix, type, callback);
				else if (i = getIteratorFn(children), "function" === typeof i) for (i === children.entries && (didWarnAboutMaps || console.warn("Using Maps as children is not supported. Use an array of keyed ReactElements instead."), didWarnAboutMaps = !0), children = i.call(children), i = 0; !(nameSoFar = children.next()).done;) nameSoFar = nameSoFar.value, type = childKey + getElementKey(nameSoFar, i++), invokeCallback += mapIntoArray(nameSoFar, array, escapedPrefix, type, callback);
				else if ("object" === type) {
					if ("function" === typeof children.then) return mapIntoArray(resolveThenable(children), array, escapedPrefix, nameSoFar, callback);
					array = String(children);
					throw Error("Objects are not valid as a React child (found: " + ("[object Object]" === array ? "object with keys {" + Object.keys(children).join(", ") + "}" : array) + "). If you meant to render a collection of children, use an array instead.");
				}
				return invokeCallback;
			}
			function mapChildren(children, func, context) {
				if (null == children) return children;
				var result = [], count = 0;
				mapIntoArray(children, result, "", "", function(child) {
					return func.call(context, child, count++);
				});
				return result;
			}
			function lazyInitializer(payload) {
				if (-1 === payload._status) {
					var ioInfo = payload._ioInfo;
					null != ioInfo && (ioInfo.start = ioInfo.end = performance.now());
					ioInfo = payload._result;
					var thenable = ioInfo();
					thenable.then(function(moduleObject) {
						if (0 === payload._status || -1 === payload._status) {
							payload._status = 1;
							payload._result = moduleObject;
							var _ioInfo = payload._ioInfo;
							null != _ioInfo && (_ioInfo.end = performance.now());
							void 0 === thenable.status && (thenable.status = "fulfilled", thenable.value = moduleObject);
						}
					}, function(error) {
						if (0 === payload._status || -1 === payload._status) {
							payload._status = 2;
							payload._result = error;
							var _ioInfo2 = payload._ioInfo;
							null != _ioInfo2 && (_ioInfo2.end = performance.now());
							void 0 === thenable.status && (thenable.status = "rejected", thenable.reason = error);
						}
					});
					ioInfo = payload._ioInfo;
					if (null != ioInfo) {
						ioInfo.value = thenable;
						var displayName = thenable.displayName;
						"string" === typeof displayName && (ioInfo.name = displayName);
					}
					-1 === payload._status && (payload._status = 0, payload._result = thenable);
				}
				if (1 === payload._status) return ioInfo = payload._result, void 0 === ioInfo && console.error("lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))\n\nDid you accidentally put curly braces around the import?", ioInfo), "default" in ioInfo || console.error("lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))", ioInfo), ioInfo.default;
				throw payload._result;
			}
			function resolveDispatcher() {
				var dispatcher = ReactSharedInternals.H;
				null === dispatcher && console.error("Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.");
				return dispatcher;
			}
			function releaseAsyncTransition() {
				ReactSharedInternals.asyncTransitions--;
			}
			function enqueueTask(task) {
				if (null === enqueueTaskImpl) try {
					var requireString = ("require" + Math.random()).slice(0, 7);
					enqueueTaskImpl = (module && module[requireString]).call(module, "timers").setImmediate;
				} catch (_err) {
					enqueueTaskImpl = function(callback) {
						!1 === didWarnAboutMessageChannel && (didWarnAboutMessageChannel = !0, "undefined" === typeof MessageChannel && console.error("This browser does not have a MessageChannel implementation, so enqueuing tasks via await act(async () => ...) will fail. Please file an issue at https://github.com/facebook/react/issues if you encounter this warning."));
						var channel = new MessageChannel();
						channel.port1.onmessage = callback;
						channel.port2.postMessage(void 0);
					};
				}
				return enqueueTaskImpl(task);
			}
			function aggregateErrors(errors) {
				return 1 < errors.length && "function" === typeof AggregateError ? new AggregateError(errors) : errors[0];
			}
			function popActScope(prevActQueue, prevActScopeDepth) {
				prevActScopeDepth !== actScopeDepth - 1 && console.error("You seem to have overlapping act() calls, this is not supported. Be sure to await previous act() calls before making a new one. ");
				actScopeDepth = prevActScopeDepth;
			}
			function recursivelyFlushAsyncActWork(returnValue, resolve, reject) {
				var queue = ReactSharedInternals.actQueue;
				if (null !== queue) if (0 !== queue.length) try {
					flushActQueue(queue);
					enqueueTask(function() {
						return recursivelyFlushAsyncActWork(returnValue, resolve, reject);
					});
					return;
				} catch (error) {
					ReactSharedInternals.thrownErrors.push(error);
				}
				else ReactSharedInternals.actQueue = null;
				0 < ReactSharedInternals.thrownErrors.length ? (queue = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, reject(queue)) : resolve(returnValue);
			}
			function flushActQueue(queue) {
				if (!isFlushing) {
					isFlushing = !0;
					var i = 0;
					try {
						for (; i < queue.length; i++) {
							var callback = queue[i];
							do {
								ReactSharedInternals.didUsePromise = !1;
								var continuation = callback(!1);
								if (null !== continuation) {
									if (ReactSharedInternals.didUsePromise) {
										queue[i] = callback;
										queue.splice(0, i);
										return;
									}
									callback = continuation;
								} else break;
							} while (1);
						}
						queue.length = 0;
					} catch (error) {
						queue.splice(0, i + 1), ReactSharedInternals.thrownErrors.push(error);
					} finally {
						isFlushing = !1;
					}
				}
			}
			"undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
			var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), MAYBE_ITERATOR_SYMBOL = Symbol.iterator, didWarnStateUpdateForUnmountedComponent = {}, ReactNoopUpdateQueue = {
				isMounted: function() {
					return !1;
				},
				enqueueForceUpdate: function(publicInstance) {
					warnNoop(publicInstance, "forceUpdate");
				},
				enqueueReplaceState: function(publicInstance) {
					warnNoop(publicInstance, "replaceState");
				},
				enqueueSetState: function(publicInstance) {
					warnNoop(publicInstance, "setState");
				}
			}, assign = Object.assign, emptyObject = {};
			Object.freeze(emptyObject);
			Component.prototype.isReactComponent = {};
			Component.prototype.setState = function(partialState, callback) {
				if ("object" !== typeof partialState && "function" !== typeof partialState && null != partialState) throw Error("takes an object of state variables to update or a function which returns an object of state variables.");
				this.updater.enqueueSetState(this, partialState, callback, "setState");
			};
			Component.prototype.forceUpdate = function(callback) {
				this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
			};
			var deprecatedAPIs = {
				isMounted: ["isMounted", "Instead, make sure to clean up subscriptions and pending requests in componentWillUnmount to prevent memory leaks."],
				replaceState: ["replaceState", "Refactor your code to use setState instead (see https://github.com/facebook/react/issues/3236)."]
			};
			for (fnName in deprecatedAPIs) deprecatedAPIs.hasOwnProperty(fnName) && defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
			ComponentDummy.prototype = Component.prototype;
			deprecatedAPIs = PureComponent.prototype = new ComponentDummy();
			deprecatedAPIs.constructor = PureComponent;
			assign(deprecatedAPIs, Component.prototype);
			deprecatedAPIs.isPureReactComponent = !0;
			var isArrayImpl = Array.isArray, REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), ReactSharedInternals = {
				H: null,
				A: null,
				T: null,
				S: null,
				actQueue: null,
				asyncTransitions: 0,
				isBatchingLegacy: !1,
				didScheduleLegacyUpdate: !1,
				didUsePromise: !1,
				thrownErrors: [],
				getCurrentStack: null,
				recentlyCreatedOwnerStacks: 0
			}, hasOwnProperty = Object.prototype.hasOwnProperty, createTask = console.createTask ? console.createTask : function() {
				return null;
			};
			deprecatedAPIs = { react_stack_bottom_frame: function(callStackForError) {
				return callStackForError();
			} };
			var specialPropKeyWarningShown, didWarnAboutOldJSXRuntime;
			var didWarnAboutElementRef = {};
			var unknownOwnerDebugStack = deprecatedAPIs.react_stack_bottom_frame.bind(deprecatedAPIs, UnknownOwner)();
			var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner));
			var didWarnAboutMaps = !1, userProvidedKeyEscapeRegex = /\/+/g, reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
				if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
					var event = new window.ErrorEvent("error", {
						bubbles: !0,
						cancelable: !0,
						message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
						error
					});
					if (!window.dispatchEvent(event)) return;
				} else if ("object" === typeof process && "function" === typeof process.emit) {
					process.emit("uncaughtException", error);
					return;
				}
				console.error(error);
			}, didWarnAboutMessageChannel = !1, enqueueTaskImpl = null, actScopeDepth = 0, didWarnNoAwaitAct = !1, isFlushing = !1, queueSeveralMicrotasks = "function" === typeof queueMicrotask ? function(callback) {
				queueMicrotask(function() {
					return queueMicrotask(callback);
				});
			} : enqueueTask;
			deprecatedAPIs = Object.freeze({
				__proto__: null,
				c: function(size) {
					return resolveDispatcher().useMemoCache(size);
				}
			});
			var fnName = {
				map: mapChildren,
				forEach: function(children, forEachFunc, forEachContext) {
					mapChildren(children, function() {
						forEachFunc.apply(this, arguments);
					}, forEachContext);
				},
				count: function(children) {
					var n = 0;
					mapChildren(children, function() {
						n++;
					});
					return n;
				},
				toArray: function(children) {
					return mapChildren(children, function(child) {
						return child;
					}) || [];
				},
				only: function(children) {
					if (!isValidElement(children)) throw Error("React.Children.only expected to receive a single React element child.");
					return children;
				}
			};
			exports.Activity = REACT_ACTIVITY_TYPE;
			exports.Children = fnName;
			exports.Component = Component;
			exports.Fragment = REACT_FRAGMENT_TYPE;
			exports.Profiler = REACT_PROFILER_TYPE;
			exports.PureComponent = PureComponent;
			exports.StrictMode = REACT_STRICT_MODE_TYPE;
			exports.Suspense = REACT_SUSPENSE_TYPE;
			exports.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ReactSharedInternals;
			exports.__COMPILER_RUNTIME = deprecatedAPIs;
			exports.act = function(callback) {
				var prevActQueue = ReactSharedInternals.actQueue, prevActScopeDepth = actScopeDepth;
				actScopeDepth++;
				var queue = ReactSharedInternals.actQueue = null !== prevActQueue ? prevActQueue : [], didAwaitActCall = !1;
				try {
					var result = callback();
				} catch (error) {
					ReactSharedInternals.thrownErrors.push(error);
				}
				if (0 < ReactSharedInternals.thrownErrors.length) throw popActScope(prevActQueue, prevActScopeDepth), callback = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, callback;
				if (null !== result && "object" === typeof result && "function" === typeof result.then) {
					var thenable = result;
					queueSeveralMicrotasks(function() {
						didAwaitActCall || didWarnNoAwaitAct || (didWarnNoAwaitAct = !0, console.error("You called act(async () => ...) without await. This could lead to unexpected testing behaviour, interleaving multiple act calls and mixing their scopes. You should - await act(async () => ...);"));
					});
					return { then: function(resolve, reject) {
						didAwaitActCall = !0;
						thenable.then(function(returnValue) {
							popActScope(prevActQueue, prevActScopeDepth);
							if (0 === prevActScopeDepth) {
								try {
									flushActQueue(queue), enqueueTask(function() {
										return recursivelyFlushAsyncActWork(returnValue, resolve, reject);
									});
								} catch (error$0) {
									ReactSharedInternals.thrownErrors.push(error$0);
								}
								if (0 < ReactSharedInternals.thrownErrors.length) {
									var _thrownError = aggregateErrors(ReactSharedInternals.thrownErrors);
									ReactSharedInternals.thrownErrors.length = 0;
									reject(_thrownError);
								}
							} else resolve(returnValue);
						}, function(error) {
							popActScope(prevActQueue, prevActScopeDepth);
							0 < ReactSharedInternals.thrownErrors.length ? (error = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, reject(error)) : reject(error);
						});
					} };
				}
				var returnValue$jscomp$0 = result;
				popActScope(prevActQueue, prevActScopeDepth);
				0 === prevActScopeDepth && (flushActQueue(queue), 0 !== queue.length && queueSeveralMicrotasks(function() {
					didAwaitActCall || didWarnNoAwaitAct || (didWarnNoAwaitAct = !0, console.error("A component suspended inside an `act` scope, but the `act` call was not awaited. When testing React components that depend on asynchronous data, you must await the result:\n\nawait act(() => ...)"));
				}), ReactSharedInternals.actQueue = null);
				if (0 < ReactSharedInternals.thrownErrors.length) throw callback = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, callback;
				return { then: function(resolve, reject) {
					didAwaitActCall = !0;
					0 === prevActScopeDepth ? (ReactSharedInternals.actQueue = queue, enqueueTask(function() {
						return recursivelyFlushAsyncActWork(returnValue$jscomp$0, resolve, reject);
					})) : resolve(returnValue$jscomp$0);
				} };
			};
			exports.cache = function(fn) {
				return function() {
					return fn.apply(null, arguments);
				};
			};
			exports.cacheSignal = function() {
				return null;
			};
			exports.captureOwnerStack = function() {
				var getCurrentStack = ReactSharedInternals.getCurrentStack;
				return null === getCurrentStack ? null : getCurrentStack();
			};
			exports.cloneElement = function(element, config, children) {
				if (null === element || void 0 === element) throw Error("The argument must be a React element, but you passed " + element + ".");
				var props = assign({}, element.props), key = element.key, owner = element._owner;
				if (null != config) {
					var JSCompiler_inline_result;
					a: {
						if (hasOwnProperty.call(config, "ref") && (JSCompiler_inline_result = Object.getOwnPropertyDescriptor(config, "ref").get) && JSCompiler_inline_result.isReactWarning) {
							JSCompiler_inline_result = !1;
							break a;
						}
						JSCompiler_inline_result = void 0 !== config.ref;
					}
					JSCompiler_inline_result && (owner = getOwner());
					hasValidKey(config) && (checkKeyStringCoercion(config.key), key = "" + config.key);
					for (propName in config) !hasOwnProperty.call(config, propName) || "key" === propName || "__self" === propName || "__source" === propName || "ref" === propName && void 0 === config.ref || (props[propName] = config[propName]);
				}
				var propName = arguments.length - 2;
				if (1 === propName) props.children = children;
				else if (1 < propName) {
					JSCompiler_inline_result = Array(propName);
					for (var i = 0; i < propName; i++) JSCompiler_inline_result[i] = arguments[i + 2];
					props.children = JSCompiler_inline_result;
				}
				props = ReactElement(element.type, key, props, owner, element._debugStack, element._debugTask);
				for (key = 2; key < arguments.length; key++) validateChildKeys(arguments[key]);
				return props;
			};
			exports.createContext = function(defaultValue) {
				defaultValue = {
					$$typeof: REACT_CONTEXT_TYPE,
					_currentValue: defaultValue,
					_currentValue2: defaultValue,
					_threadCount: 0,
					Provider: null,
					Consumer: null
				};
				defaultValue.Provider = defaultValue;
				defaultValue.Consumer = {
					$$typeof: REACT_CONSUMER_TYPE,
					_context: defaultValue
				};
				defaultValue._currentRenderer = null;
				defaultValue._currentRenderer2 = null;
				return defaultValue;
			};
			exports.createElement = function(type, config, children) {
				for (var i = 2; i < arguments.length; i++) validateChildKeys(arguments[i]);
				i = {};
				var key = null;
				if (null != config) for (propName in didWarnAboutOldJSXRuntime || !("__self" in config) || "key" in config || (didWarnAboutOldJSXRuntime = !0, console.warn("Your app (or one of its dependencies) is using an outdated JSX transform. Update to the modern JSX transform for faster performance: https://react.dev/link/new-jsx-transform")), hasValidKey(config) && (checkKeyStringCoercion(config.key), key = "" + config.key), config) hasOwnProperty.call(config, propName) && "key" !== propName && "__self" !== propName && "__source" !== propName && (i[propName] = config[propName]);
				var childrenLength = arguments.length - 2;
				if (1 === childrenLength) i.children = children;
				else if (1 < childrenLength) {
					for (var childArray = Array(childrenLength), _i = 0; _i < childrenLength; _i++) childArray[_i] = arguments[_i + 2];
					Object.freeze && Object.freeze(childArray);
					i.children = childArray;
				}
				if (type && type.defaultProps) for (propName in childrenLength = type.defaultProps, childrenLength) void 0 === i[propName] && (i[propName] = childrenLength[propName]);
				key && defineKeyPropWarningGetter(i, "function" === typeof type ? type.displayName || type.name || "Unknown" : type);
				var propName = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
				return ReactElement(type, key, i, getOwner(), propName ? Error("react-stack-top-frame") : unknownOwnerDebugStack, propName ? createTask(getTaskName(type)) : unknownOwnerDebugTask);
			};
			exports.createRef = function() {
				var refObject = { current: null };
				Object.seal(refObject);
				return refObject;
			};
			exports.forwardRef = function(render) {
				null != render && render.$$typeof === REACT_MEMO_TYPE ? console.error("forwardRef requires a render function but received a `memo` component. Instead of forwardRef(memo(...)), use memo(forwardRef(...)).") : "function" !== typeof render ? console.error("forwardRef requires a render function but was given %s.", null === render ? "null" : typeof render) : 0 !== render.length && 2 !== render.length && console.error("forwardRef render functions accept exactly two parameters: props and ref. %s", 1 === render.length ? "Did you forget to use the ref parameter?" : "Any additional parameter will be undefined.");
				null != render && null != render.defaultProps && console.error("forwardRef render functions do not support defaultProps. Did you accidentally pass a React component?");
				var elementType = {
					$$typeof: REACT_FORWARD_REF_TYPE,
					render
				}, ownName;
				Object.defineProperty(elementType, "displayName", {
					enumerable: !1,
					configurable: !0,
					get: function() {
						return ownName;
					},
					set: function(name) {
						ownName = name;
						render.name || render.displayName || (Object.defineProperty(render, "name", { value: name }), render.displayName = name);
					}
				});
				return elementType;
			};
			exports.isValidElement = isValidElement;
			exports.lazy = function(ctor) {
				ctor = {
					_status: -1,
					_result: ctor
				};
				var lazyType = {
					$$typeof: REACT_LAZY_TYPE,
					_payload: ctor,
					_init: lazyInitializer
				}, ioInfo = {
					name: "lazy",
					start: -1,
					end: -1,
					value: null,
					owner: null,
					debugStack: Error("react-stack-top-frame"),
					debugTask: console.createTask ? console.createTask("lazy()") : null
				};
				ctor._ioInfo = ioInfo;
				lazyType._debugInfo = [{ awaited: ioInfo }];
				return lazyType;
			};
			exports.memo = function(type, compare) {
				type ?? console.error("memo: The first argument must be a component. Instead received: %s", null === type ? "null" : typeof type);
				compare = {
					$$typeof: REACT_MEMO_TYPE,
					type,
					compare: void 0 === compare ? null : compare
				};
				var ownName;
				Object.defineProperty(compare, "displayName", {
					enumerable: !1,
					configurable: !0,
					get: function() {
						return ownName;
					},
					set: function(name) {
						ownName = name;
						type.name || type.displayName || (Object.defineProperty(type, "name", { value: name }), type.displayName = name);
					}
				});
				return compare;
			};
			exports.startTransition = function(scope) {
				var prevTransition = ReactSharedInternals.T, currentTransition = {};
				currentTransition._updatedFibers = /* @__PURE__ */ new Set();
				ReactSharedInternals.T = currentTransition;
				try {
					var returnValue = scope(), onStartTransitionFinish = ReactSharedInternals.S;
					null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
					"object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && (ReactSharedInternals.asyncTransitions++, returnValue.then(releaseAsyncTransition, releaseAsyncTransition), returnValue.then(noop, reportGlobalError));
				} catch (error) {
					reportGlobalError(error);
				} finally {
					null === prevTransition && currentTransition._updatedFibers && (scope = currentTransition._updatedFibers.size, currentTransition._updatedFibers.clear(), 10 < scope && console.warn("Detected a large number of updates inside startTransition. If this is due to a subscription please re-write it to use React provided hooks. Otherwise concurrent mode guarantees are off the table.")), null !== prevTransition && null !== currentTransition.types && (null !== prevTransition.types && prevTransition.types !== currentTransition.types && console.error("We expected inner Transitions to have transferred the outer types set and that you cannot add to the outer Transition while inside the inner.This is a bug in React."), prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
				}
			};
			exports.unstable_useCacheRefresh = function() {
				return resolveDispatcher().useCacheRefresh();
			};
			exports.use = function(usable) {
				return resolveDispatcher().use(usable);
			};
			exports.useActionState = function(action, initialState, permalink) {
				return resolveDispatcher().useActionState(action, initialState, permalink);
			};
			exports.useCallback = function(callback, deps) {
				return resolveDispatcher().useCallback(callback, deps);
			};
			exports.useContext = function(Context) {
				var dispatcher = resolveDispatcher();
				Context.$$typeof === REACT_CONSUMER_TYPE && console.error("Calling useContext(Context.Consumer) is not supported and will cause bugs. Did you mean to call useContext(Context) instead?");
				return dispatcher.useContext(Context);
			};
			exports.useDebugValue = function(value, formatterFn) {
				return resolveDispatcher().useDebugValue(value, formatterFn);
			};
			exports.useDeferredValue = function(value, initialValue) {
				return resolveDispatcher().useDeferredValue(value, initialValue);
			};
			exports.useEffect = function(create, deps) {
				create ?? console.warn("React Hook useEffect requires an effect callback. Did you forget to pass a callback to the hook?");
				return resolveDispatcher().useEffect(create, deps);
			};
			exports.useEffectEvent = function(callback) {
				return resolveDispatcher().useEffectEvent(callback);
			};
			exports.useId = function() {
				return resolveDispatcher().useId();
			};
			exports.useImperativeHandle = function(ref, create, deps) {
				return resolveDispatcher().useImperativeHandle(ref, create, deps);
			};
			exports.useInsertionEffect = function(create, deps) {
				create ?? console.warn("React Hook useInsertionEffect requires an effect callback. Did you forget to pass a callback to the hook?");
				return resolveDispatcher().useInsertionEffect(create, deps);
			};
			exports.useLayoutEffect = function(create, deps) {
				create ?? console.warn("React Hook useLayoutEffect requires an effect callback. Did you forget to pass a callback to the hook?");
				return resolveDispatcher().useLayoutEffect(create, deps);
			};
			exports.useMemo = function(create, deps) {
				return resolveDispatcher().useMemo(create, deps);
			};
			exports.useOptimistic = function(passthrough, reducer) {
				return resolveDispatcher().useOptimistic(passthrough, reducer);
			};
			exports.useReducer = function(reducer, initialArg, init) {
				return resolveDispatcher().useReducer(reducer, initialArg, init);
			};
			exports.useRef = function(initialValue) {
				return resolveDispatcher().useRef(initialValue);
			};
			exports.useState = function(initialState) {
				return resolveDispatcher().useState(initialState);
			};
			exports.useSyncExternalStore = function(subscribe, getSnapshot, getServerSnapshot) {
				return resolveDispatcher().useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
			};
			exports.useTransition = function() {
				return resolveDispatcher().useTransition();
			};
			exports.version = "19.2.4";
			"undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
		})();
	}));
	//#endregion
	//#region ../../../../Documents/Unreal Projects/fall-of-an-empire/WebUI/node_modules/react/index.js
	var require_react = /* @__PURE__ */ __commonJSMin(((exports, module) => {
		if (process.env.NODE_ENV === "production") module.exports = require_react_production();
		else module.exports = require_react_development();
	}));
	//#endregion
	//#region node_modules/react-devtools-inline/dist/backend.js
	var require_backend$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
		(() => {
			var __webpack_modules__ = {
				3018: ((module$1, __unused_webpack_exports, __webpack_require__) => {
					"use strict";
					const Yallist = __webpack_require__(5986);
					const MAX = Symbol("max");
					const LENGTH = Symbol("length");
					const LENGTH_CALCULATOR = Symbol("lengthCalculator");
					const ALLOW_STALE = Symbol("allowStale");
					const MAX_AGE = Symbol("maxAge");
					const DISPOSE = Symbol("dispose");
					const NO_DISPOSE_ON_SET = Symbol("noDisposeOnSet");
					const LRU_LIST = Symbol("lruList");
					const CACHE = Symbol("cache");
					const UPDATE_AGE_ON_GET = Symbol("updateAgeOnGet");
					const naiveLength = () => 1;
					class LRUCache {
						constructor(options) {
							if (typeof options === "number") options = { max: options };
							if (!options) options = {};
							if (options.max && (typeof options.max !== "number" || options.max < 0)) throw new TypeError("max must be a non-negative number");
							this[MAX] = options.max || Infinity;
							const lc = options.length || naiveLength;
							this[LENGTH_CALCULATOR] = typeof lc !== "function" ? naiveLength : lc;
							this[ALLOW_STALE] = options.stale || false;
							if (options.maxAge && typeof options.maxAge !== "number") throw new TypeError("maxAge must be a number");
							this[MAX_AGE] = options.maxAge || 0;
							this[DISPOSE] = options.dispose;
							this[NO_DISPOSE_ON_SET] = options.noDisposeOnSet || false;
							this[UPDATE_AGE_ON_GET] = options.updateAgeOnGet || false;
							this.reset();
						}
						set max(mL) {
							if (typeof mL !== "number" || mL < 0) throw new TypeError("max must be a non-negative number");
							this[MAX] = mL || Infinity;
							trim(this);
						}
						get max() {
							return this[MAX];
						}
						set allowStale(allowStale) {
							this[ALLOW_STALE] = !!allowStale;
						}
						get allowStale() {
							return this[ALLOW_STALE];
						}
						set maxAge(mA) {
							if (typeof mA !== "number") throw new TypeError("maxAge must be a non-negative number");
							this[MAX_AGE] = mA;
							trim(this);
						}
						get maxAge() {
							return this[MAX_AGE];
						}
						set lengthCalculator(lC) {
							if (typeof lC !== "function") lC = naiveLength;
							if (lC !== this[LENGTH_CALCULATOR]) {
								this[LENGTH_CALCULATOR] = lC;
								this[LENGTH] = 0;
								this[LRU_LIST].forEach((hit) => {
									hit.length = this[LENGTH_CALCULATOR](hit.value, hit.key);
									this[LENGTH] += hit.length;
								});
							}
							trim(this);
						}
						get lengthCalculator() {
							return this[LENGTH_CALCULATOR];
						}
						get length() {
							return this[LENGTH];
						}
						get itemCount() {
							return this[LRU_LIST].length;
						}
						rforEach(fn, thisp) {
							thisp = thisp || this;
							for (let walker = this[LRU_LIST].tail; walker !== null;) {
								const prev = walker.prev;
								forEachStep(this, fn, walker, thisp);
								walker = prev;
							}
						}
						forEach(fn, thisp) {
							thisp = thisp || this;
							for (let walker = this[LRU_LIST].head; walker !== null;) {
								const next = walker.next;
								forEachStep(this, fn, walker, thisp);
								walker = next;
							}
						}
						keys() {
							return this[LRU_LIST].toArray().map((k) => k.key);
						}
						values() {
							return this[LRU_LIST].toArray().map((k) => k.value);
						}
						reset() {
							if (this[DISPOSE] && this[LRU_LIST] && this[LRU_LIST].length) this[LRU_LIST].forEach((hit) => this[DISPOSE](hit.key, hit.value));
							this[CACHE] = /* @__PURE__ */ new Map();
							this[LRU_LIST] = new Yallist();
							this[LENGTH] = 0;
						}
						dump() {
							return this[LRU_LIST].map((hit) => isStale(this, hit) ? false : {
								k: hit.key,
								v: hit.value,
								e: hit.now + (hit.maxAge || 0)
							}).toArray().filter((h) => h);
						}
						dumpLru() {
							return this[LRU_LIST];
						}
						set(key, value, maxAge) {
							maxAge = maxAge || this[MAX_AGE];
							if (maxAge && typeof maxAge !== "number") throw new TypeError("maxAge must be a number");
							const now = maxAge ? Date.now() : 0;
							const len = this[LENGTH_CALCULATOR](value, key);
							if (this[CACHE].has(key)) {
								if (len > this[MAX]) {
									del(this, this[CACHE].get(key));
									return false;
								}
								const item = this[CACHE].get(key).value;
								if (this[DISPOSE]) {
									if (!this[NO_DISPOSE_ON_SET]) this[DISPOSE](key, item.value);
								}
								item.now = now;
								item.maxAge = maxAge;
								item.value = value;
								this[LENGTH] += len - item.length;
								item.length = len;
								this.get(key);
								trim(this);
								return true;
							}
							const hit = new Entry(key, value, len, now, maxAge);
							if (hit.length > this[MAX]) {
								if (this[DISPOSE]) this[DISPOSE](key, value);
								return false;
							}
							this[LENGTH] += hit.length;
							this[LRU_LIST].unshift(hit);
							this[CACHE].set(key, this[LRU_LIST].head);
							trim(this);
							return true;
						}
						has(key) {
							if (!this[CACHE].has(key)) return false;
							const hit = this[CACHE].get(key).value;
							return !isStale(this, hit);
						}
						get(key) {
							return get(this, key, true);
						}
						peek(key) {
							return get(this, key, false);
						}
						pop() {
							const node = this[LRU_LIST].tail;
							if (!node) return null;
							del(this, node);
							return node.value;
						}
						del(key) {
							del(this, this[CACHE].get(key));
						}
						load(arr) {
							this.reset();
							const now = Date.now();
							for (let l = arr.length - 1; l >= 0; l--) {
								const hit = arr[l];
								const expiresAt = hit.e || 0;
								if (expiresAt === 0) this.set(hit.k, hit.v);
								else {
									const maxAge = expiresAt - now;
									if (maxAge > 0) this.set(hit.k, hit.v, maxAge);
								}
							}
						}
						prune() {
							this[CACHE].forEach((value, key) => get(this, key, false));
						}
					}
					const get = (self, key, doUse) => {
						const node = self[CACHE].get(key);
						if (node) {
							const hit = node.value;
							if (isStale(self, hit)) {
								del(self, node);
								if (!self[ALLOW_STALE]) return void 0;
							} else if (doUse) {
								if (self[UPDATE_AGE_ON_GET]) node.value.now = Date.now();
								self[LRU_LIST].unshiftNode(node);
							}
							return hit.value;
						}
					};
					const isStale = (self, hit) => {
						if (!hit || !hit.maxAge && !self[MAX_AGE]) return false;
						const diff = Date.now() - hit.now;
						return hit.maxAge ? diff > hit.maxAge : self[MAX_AGE] && diff > self[MAX_AGE];
					};
					const trim = (self) => {
						if (self[LENGTH] > self[MAX]) for (let walker = self[LRU_LIST].tail; self[LENGTH] > self[MAX] && walker !== null;) {
							const prev = walker.prev;
							del(self, walker);
							walker = prev;
						}
					};
					const del = (self, node) => {
						if (node) {
							const hit = node.value;
							if (self[DISPOSE]) self[DISPOSE](hit.key, hit.value);
							self[LENGTH] -= hit.length;
							self[CACHE].delete(hit.key);
							self[LRU_LIST].removeNode(node);
						}
					};
					class Entry {
						constructor(key, value, length, now, maxAge) {
							this.key = key;
							this.value = value;
							this.length = length;
							this.now = now;
							this.maxAge = maxAge || 0;
						}
					}
					const forEachStep = (self, fn, node, thisp) => {
						let hit = node.value;
						if (isStale(self, hit)) {
							del(self, node);
							if (!self[ALLOW_STALE]) hit = void 0;
						}
						if (hit) fn.call(thisp, hit.value, hit.key, self);
					};
					module$1.exports = LRUCache;
				}),
				7533: ((module$2) => {
					"use strict";
					module$2.exports = function(Yallist) {
						Yallist.prototype[Symbol.iterator] = function* () {
							for (let walker = this.head; walker; walker = walker.next) yield walker.value;
						};
					};
				}),
				5986: ((module$3, __unused_webpack_exports, __webpack_require__) => {
					"use strict";
					module$3.exports = Yallist;
					Yallist.Node = Node;
					Yallist.create = Yallist;
					function Yallist(list) {
						var self = this;
						if (!(self instanceof Yallist)) self = new Yallist();
						self.tail = null;
						self.head = null;
						self.length = 0;
						if (list && typeof list.forEach === "function") list.forEach(function(item) {
							self.push(item);
						});
						else if (arguments.length > 0) for (var i = 0, l = arguments.length; i < l; i++) self.push(arguments[i]);
						return self;
					}
					Yallist.prototype.removeNode = function(node) {
						if (node.list !== this) throw new Error("removing node which does not belong to this list");
						var next = node.next;
						var prev = node.prev;
						if (next) next.prev = prev;
						if (prev) prev.next = next;
						if (node === this.head) this.head = next;
						if (node === this.tail) this.tail = prev;
						node.list.length--;
						node.next = null;
						node.prev = null;
						node.list = null;
						return next;
					};
					Yallist.prototype.unshiftNode = function(node) {
						if (node === this.head) return;
						if (node.list) node.list.removeNode(node);
						var head = this.head;
						node.list = this;
						node.next = head;
						if (head) head.prev = node;
						this.head = node;
						if (!this.tail) this.tail = node;
						this.length++;
					};
					Yallist.prototype.pushNode = function(node) {
						if (node === this.tail) return;
						if (node.list) node.list.removeNode(node);
						var tail = this.tail;
						node.list = this;
						node.prev = tail;
						if (tail) tail.next = node;
						this.tail = node;
						if (!this.head) this.head = node;
						this.length++;
					};
					Yallist.prototype.push = function() {
						for (var i = 0, l = arguments.length; i < l; i++) push(this, arguments[i]);
						return this.length;
					};
					Yallist.prototype.unshift = function() {
						for (var i = 0, l = arguments.length; i < l; i++) unshift(this, arguments[i]);
						return this.length;
					};
					Yallist.prototype.pop = function() {
						if (!this.tail) return;
						var res = this.tail.value;
						this.tail = this.tail.prev;
						if (this.tail) this.tail.next = null;
						else this.head = null;
						this.length--;
						return res;
					};
					Yallist.prototype.shift = function() {
						if (!this.head) return;
						var res = this.head.value;
						this.head = this.head.next;
						if (this.head) this.head.prev = null;
						else this.tail = null;
						this.length--;
						return res;
					};
					Yallist.prototype.forEach = function(fn, thisp) {
						thisp = thisp || this;
						for (var walker = this.head, i = 0; walker !== null; i++) {
							fn.call(thisp, walker.value, i, this);
							walker = walker.next;
						}
					};
					Yallist.prototype.forEachReverse = function(fn, thisp) {
						thisp = thisp || this;
						for (var walker = this.tail, i = this.length - 1; walker !== null; i--) {
							fn.call(thisp, walker.value, i, this);
							walker = walker.prev;
						}
					};
					Yallist.prototype.get = function(n) {
						for (var i = 0, walker = this.head; walker !== null && i < n; i++) walker = walker.next;
						if (i === n && walker !== null) return walker.value;
					};
					Yallist.prototype.getReverse = function(n) {
						for (var i = 0, walker = this.tail; walker !== null && i < n; i++) walker = walker.prev;
						if (i === n && walker !== null) return walker.value;
					};
					Yallist.prototype.map = function(fn, thisp) {
						thisp = thisp || this;
						var res = new Yallist();
						for (var walker = this.head; walker !== null;) {
							res.push(fn.call(thisp, walker.value, this));
							walker = walker.next;
						}
						return res;
					};
					Yallist.prototype.mapReverse = function(fn, thisp) {
						thisp = thisp || this;
						var res = new Yallist();
						for (var walker = this.tail; walker !== null;) {
							res.push(fn.call(thisp, walker.value, this));
							walker = walker.prev;
						}
						return res;
					};
					Yallist.prototype.reduce = function(fn, initial) {
						var acc;
						var walker = this.head;
						if (arguments.length > 1) acc = initial;
						else if (this.head) {
							walker = this.head.next;
							acc = this.head.value;
						} else throw new TypeError("Reduce of empty list with no initial value");
						for (var i = 0; walker !== null; i++) {
							acc = fn(acc, walker.value, i);
							walker = walker.next;
						}
						return acc;
					};
					Yallist.prototype.reduceReverse = function(fn, initial) {
						var acc;
						var walker = this.tail;
						if (arguments.length > 1) acc = initial;
						else if (this.tail) {
							walker = this.tail.prev;
							acc = this.tail.value;
						} else throw new TypeError("Reduce of empty list with no initial value");
						for (var i = this.length - 1; walker !== null; i--) {
							acc = fn(acc, walker.value, i);
							walker = walker.prev;
						}
						return acc;
					};
					Yallist.prototype.toArray = function() {
						var arr = new Array(this.length);
						for (var i = 0, walker = this.head; walker !== null; i++) {
							arr[i] = walker.value;
							walker = walker.next;
						}
						return arr;
					};
					Yallist.prototype.toArrayReverse = function() {
						var arr = new Array(this.length);
						for (var i = 0, walker = this.tail; walker !== null; i++) {
							arr[i] = walker.value;
							walker = walker.prev;
						}
						return arr;
					};
					Yallist.prototype.slice = function(from, to) {
						to = to || this.length;
						if (to < 0) to += this.length;
						from = from || 0;
						if (from < 0) from += this.length;
						var ret = new Yallist();
						if (to < from || to < 0) return ret;
						if (from < 0) from = 0;
						if (to > this.length) to = this.length;
						for (var i = 0, walker = this.head; walker !== null && i < from; i++) walker = walker.next;
						for (; walker !== null && i < to; i++, walker = walker.next) ret.push(walker.value);
						return ret;
					};
					Yallist.prototype.sliceReverse = function(from, to) {
						to = to || this.length;
						if (to < 0) to += this.length;
						from = from || 0;
						if (from < 0) from += this.length;
						var ret = new Yallist();
						if (to < from || to < 0) return ret;
						if (from < 0) from = 0;
						if (to > this.length) to = this.length;
						for (var i = this.length, walker = this.tail; walker !== null && i > to; i--) walker = walker.prev;
						for (; walker !== null && i > from; i--, walker = walker.prev) ret.push(walker.value);
						return ret;
					};
					Yallist.prototype.splice = function(start, deleteCount) {
						if (start > this.length) start = this.length - 1;
						if (start < 0) start = this.length + start;
						for (var i = 0, walker = this.head; walker !== null && i < start; i++) walker = walker.next;
						var ret = [];
						for (var i = 0; walker && i < deleteCount; i++) {
							ret.push(walker.value);
							walker = this.removeNode(walker);
						}
						if (walker === null) walker = this.tail;
						if (walker !== this.head && walker !== this.tail) walker = walker.prev;
						for (var i = 2; i < arguments.length; i++) walker = insert(this, walker, arguments[i]);
						return ret;
					};
					Yallist.prototype.reverse = function() {
						var head = this.head;
						var tail = this.tail;
						for (var walker = head; walker !== null; walker = walker.prev) {
							var p = walker.prev;
							walker.prev = walker.next;
							walker.next = p;
						}
						this.head = tail;
						this.tail = head;
						return this;
					};
					function insert(self, node, value) {
						var inserted = node === self.head ? new Node(value, null, node, self) : new Node(value, node, node.next, self);
						if (inserted.next === null) self.tail = inserted;
						if (inserted.prev === null) self.head = inserted;
						self.length++;
						return inserted;
					}
					function push(self, item) {
						self.tail = new Node(item, self.tail, null, self);
						if (!self.head) self.head = self.tail;
						self.length++;
					}
					function unshift(self, item) {
						self.head = new Node(item, null, self.head, self);
						if (!self.tail) self.tail = self.head;
						self.length++;
					}
					function Node(value, prev, next, list) {
						if (!(this instanceof Node)) return new Node(value, prev, next, list);
						this.list = list;
						this.value = value;
						if (prev) {
							prev.next = this;
							this.prev = prev;
						} else this.prev = null;
						if (next) {
							next.prev = this;
							this.next = next;
						} else this.next = null;
					}
					try {
						__webpack_require__(7533)(Yallist);
					} catch (er) {}
				}),
				2235: (function(module$4, exports$1, __webpack_require__) {
					var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;
					(function(root, factory) {
						"use strict";
						__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(5907)], __WEBPACK_AMD_DEFINE_FACTORY__ = factory, __WEBPACK_AMD_DEFINE_RESULT__ = typeof __WEBPACK_AMD_DEFINE_FACTORY__ === "function" ? __WEBPACK_AMD_DEFINE_FACTORY__.apply(exports$1, __WEBPACK_AMD_DEFINE_ARRAY__) : __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_RESULT__ !== void 0 && (module$4.exports = __WEBPACK_AMD_DEFINE_RESULT__);
					})(this, function ErrorStackParser(StackFrame) {
						"use strict";
						var FIREFOX_SAFARI_STACK_REGEXP = /(^|@)\S+:\d+/;
						var CHROME_IE_STACK_REGEXP = /^\s*at .*(\S+:\d+|\(native\))/m;
						var SAFARI_NATIVE_CODE_REGEXP = /^(eval@)?(\[native code])?$/;
						return {
							parse: function ErrorStackParser$$parse(error) {
								if (typeof error.stacktrace !== "undefined" || typeof error["opera#sourceloc"] !== "undefined") return this.parseOpera(error);
								else if (error.stack && error.stack.match(CHROME_IE_STACK_REGEXP)) return this.parseV8OrIE(error);
								else if (error.stack) return this.parseFFOrSafari(error);
								else throw new Error("Cannot parse given Error object");
							},
							extractLocation: function ErrorStackParser$$extractLocation(urlLike) {
								if (urlLike.indexOf(":") === -1) return [urlLike];
								var parts = /(.+?)(?::(\d+))?(?::(\d+))?$/.exec(urlLike.replace(/[()]/g, ""));
								return [
									parts[1],
									parts[2] || void 0,
									parts[3] || void 0
								];
							},
							parseV8OrIE: function ErrorStackParser$$parseV8OrIE(error) {
								return error.stack.split("\n").filter(function(line) {
									return !!line.match(CHROME_IE_STACK_REGEXP);
								}, this).map(function(line) {
									if (line.indexOf("(eval ") > -1) line = line.replace(/eval code/g, "eval").replace(/(\(eval at [^()]*)|(,.*$)/g, "");
									var sanitizedLine = line.replace(/^\s+/, "").replace(/\(eval code/g, "(").replace(/^.*?\s+/, "");
									var location = sanitizedLine.match(/ (\(.+\)$)/);
									sanitizedLine = location ? sanitizedLine.replace(location[0], "") : sanitizedLine;
									var locationParts = this.extractLocation(location ? location[1] : sanitizedLine);
									return new StackFrame({
										functionName: location && sanitizedLine || void 0,
										fileName: ["eval", "<anonymous>"].indexOf(locationParts[0]) > -1 ? void 0 : locationParts[0],
										lineNumber: locationParts[1],
										columnNumber: locationParts[2],
										source: line
									});
								}, this);
							},
							parseFFOrSafari: function ErrorStackParser$$parseFFOrSafari(error) {
								return error.stack.split("\n").filter(function(line) {
									return !line.match(SAFARI_NATIVE_CODE_REGEXP);
								}, this).map(function(line) {
									if (line.indexOf(" > eval") > -1) line = line.replace(/ line (\d+)(?: > eval line \d+)* > eval:\d+:\d+/g, ":$1");
									if (line.indexOf("@") === -1 && line.indexOf(":") === -1) return new StackFrame({ functionName: line });
									else {
										var functionNameRegex = /((.*".+"[^@]*)?[^@]*)(?:@)/;
										var matches = line.match(functionNameRegex);
										var functionName = matches && matches[1] ? matches[1] : void 0;
										var locationParts = this.extractLocation(line.replace(functionNameRegex, ""));
										return new StackFrame({
											functionName,
											fileName: locationParts[0],
											lineNumber: locationParts[1],
											columnNumber: locationParts[2],
											source: line
										});
									}
								}, this);
							},
							parseOpera: function ErrorStackParser$$parseOpera(e) {
								if (!e.stacktrace || e.message.indexOf("\n") > -1 && e.message.split("\n").length > e.stacktrace.split("\n").length) return this.parseOpera9(e);
								else if (!e.stack) return this.parseOpera10(e);
								else return this.parseOpera11(e);
							},
							parseOpera9: function ErrorStackParser$$parseOpera9(e) {
								var lineRE = /Line (\d+).*script (?:in )?(\S+)/i;
								var lines = e.message.split("\n");
								var result = [];
								for (var i = 2, len = lines.length; i < len; i += 2) {
									var match = lineRE.exec(lines[i]);
									if (match) result.push(new StackFrame({
										fileName: match[2],
										lineNumber: match[1],
										source: lines[i]
									}));
								}
								return result;
							},
							parseOpera10: function ErrorStackParser$$parseOpera10(e) {
								var lineRE = /Line (\d+).*script (?:in )?(\S+)(?:: In function (\S+))?$/i;
								var lines = e.stacktrace.split("\n");
								var result = [];
								for (var i = 0, len = lines.length; i < len; i += 2) {
									var match = lineRE.exec(lines[i]);
									if (match) result.push(new StackFrame({
										functionName: match[3] || void 0,
										fileName: match[2],
										lineNumber: match[1],
										source: lines[i]
									}));
								}
								return result;
							},
							parseOpera11: function ErrorStackParser$$parseOpera11(error) {
								return error.stack.split("\n").filter(function(line) {
									return !!line.match(FIREFOX_SAFARI_STACK_REGEXP) && !line.match(/^Error created at/);
								}, this).map(function(line) {
									var tokens = line.split("@");
									var locationParts = this.extractLocation(tokens.pop());
									var functionCall = tokens.shift() || "";
									var functionName = functionCall.replace(/<anonymous function(: (\w+))?>/, "$2").replace(/\([^)]*\)/g, "") || void 0;
									var argsRaw;
									if (functionCall.match(/\(([^)]*)\)/)) argsRaw = functionCall.replace(/^[^(]+\(([^)]*)\)$/, "$1");
									return new StackFrame({
										functionName,
										args: argsRaw === void 0 || argsRaw === "[arguments not available]" ? void 0 : argsRaw.split(","),
										fileName: locationParts[0],
										lineNumber: locationParts[1],
										columnNumber: locationParts[2],
										source: line
									});
								}, this);
							}
						};
					});
				}),
				5907: (function(module$5, exports$2) {
					var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;
					(function(root, factory) {
						"use strict";
						__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_FACTORY__ = factory, __WEBPACK_AMD_DEFINE_RESULT__ = typeof __WEBPACK_AMD_DEFINE_FACTORY__ === "function" ? __WEBPACK_AMD_DEFINE_FACTORY__.apply(exports$2, __WEBPACK_AMD_DEFINE_ARRAY__) : __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_RESULT__ !== void 0 && (module$5.exports = __WEBPACK_AMD_DEFINE_RESULT__);
					})(this, function() {
						"use strict";
						function _isNumber(n) {
							return !isNaN(parseFloat(n)) && isFinite(n);
						}
						function _capitalize(str) {
							return str.charAt(0).toUpperCase() + str.substring(1);
						}
						function _getter(p) {
							return function() {
								return this[p];
							};
						}
						var booleanProps = [
							"isConstructor",
							"isEval",
							"isNative",
							"isToplevel"
						];
						var numericProps = ["columnNumber", "lineNumber"];
						var stringProps = [
							"fileName",
							"functionName",
							"source"
						];
						var props = booleanProps.concat(numericProps, stringProps, ["args"], ["evalOrigin"]);
						function StackFrame(obj) {
							if (!obj) return;
							for (var i = 0; i < props.length; i++) if (obj[props[i]] !== void 0) this["set" + _capitalize(props[i])](obj[props[i]]);
						}
						StackFrame.prototype = {
							getArgs: function() {
								return this.args;
							},
							setArgs: function(v) {
								if (Object.prototype.toString.call(v) !== "[object Array]") throw new TypeError("Args must be an Array");
								this.args = v;
							},
							getEvalOrigin: function() {
								return this.evalOrigin;
							},
							setEvalOrigin: function(v) {
								if (v instanceof StackFrame) this.evalOrigin = v;
								else if (v instanceof Object) this.evalOrigin = new StackFrame(v);
								else throw new TypeError("Eval Origin must be an Object or StackFrame");
							},
							toString: function() {
								var fileName = this.getFileName() || "";
								var lineNumber = this.getLineNumber() || "";
								var columnNumber = this.getColumnNumber() || "";
								var functionName = this.getFunctionName() || "";
								if (this.getIsEval()) {
									if (fileName) return "[eval] (" + fileName + ":" + lineNumber + ":" + columnNumber + ")";
									return "[eval]:" + lineNumber + ":" + columnNumber;
								}
								if (functionName) return functionName + " (" + fileName + ":" + lineNumber + ":" + columnNumber + ")";
								return fileName + ":" + lineNumber + ":" + columnNumber;
							}
						};
						StackFrame.fromString = function StackFrame$$fromString(str) {
							var argsStartIndex = str.indexOf("(");
							var argsEndIndex = str.lastIndexOf(")");
							var functionName = str.substring(0, argsStartIndex);
							var args = str.substring(argsStartIndex + 1, argsEndIndex).split(",");
							var locationString = str.substring(argsEndIndex + 1);
							if (locationString.indexOf("@") === 0) {
								var parts = /@(.+?)(?::(\d+))?(?::(\d+))?$/.exec(locationString, "");
								var fileName = parts[1];
								var lineNumber = parts[2];
								var columnNumber = parts[3];
							}
							return new StackFrame({
								functionName,
								args: args || void 0,
								fileName,
								lineNumber: lineNumber || void 0,
								columnNumber: columnNumber || void 0
							});
						};
						for (var i = 0; i < booleanProps.length; i++) {
							StackFrame.prototype["get" + _capitalize(booleanProps[i])] = _getter(booleanProps[i]);
							StackFrame.prototype["set" + _capitalize(booleanProps[i])] = function(p) {
								return function(v) {
									this[p] = Boolean(v);
								};
							}(booleanProps[i]);
						}
						for (var j = 0; j < numericProps.length; j++) {
							StackFrame.prototype["get" + _capitalize(numericProps[j])] = _getter(numericProps[j]);
							StackFrame.prototype["set" + _capitalize(numericProps[j])] = function(p) {
								return function(v) {
									if (!_isNumber(v)) throw new TypeError(p + " must be a Number");
									this[p] = Number(v);
								};
							}(numericProps[j]);
						}
						for (var k = 0; k < stringProps.length; k++) {
							StackFrame.prototype["get" + _capitalize(stringProps[k])] = _getter(stringProps[k]);
							StackFrame.prototype["set" + _capitalize(stringProps[k])] = function(p) {
								return function(v) {
									this[p] = String(v);
								};
							}(stringProps[k]);
						}
						return StackFrame;
					});
				})
			};
			var __webpack_module_cache__ = {};
			function __webpack_require__(moduleId) {
				var cachedModule = __webpack_module_cache__[moduleId];
				if (cachedModule !== void 0) return cachedModule.exports;
				var module$6 = __webpack_module_cache__[moduleId] = { exports: {} };
				__webpack_modules__[moduleId].call(module$6.exports, module$6, module$6.exports, __webpack_require__);
				return module$6.exports;
			}
			__webpack_require__.n = (module$7) => {
				var getter = module$7 && module$7.__esModule ? () => module$7["default"] : () => module$7;
				__webpack_require__.d(getter, { a: getter });
				return getter;
			};
			__webpack_require__.d = (exports$3, definition) => {
				for (var key in definition) if (__webpack_require__.o(definition, key) && !__webpack_require__.o(exports$3, key)) Object.defineProperty(exports$3, key, {
					enumerable: true,
					get: definition[key]
				});
			};
			__webpack_require__.o = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
			__webpack_require__.r = (exports$4) => {
				if (typeof Symbol !== "undefined" && Symbol.toStringTag) Object.defineProperty(exports$4, Symbol.toStringTag, { value: "Module" });
				Object.defineProperty(exports$4, "__esModule", { value: true });
			};
			var __webpack_exports__ = {};
			(() => {
				"use strict";
				__webpack_require__.r(__webpack_exports__);
				__webpack_require__.d(__webpack_exports__, {
					"activate": () => activate,
					"createBridge": () => createBridge,
					"initialize": () => backend_initialize
				});
				function _defineProperty(obj, key, value) {
					key = _toPropertyKey(key);
					if (key in obj) Object.defineProperty(obj, key, {
						value,
						enumerable: true,
						configurable: true,
						writable: true
					});
					else obj[key] = value;
					return obj;
				}
				function _toPropertyKey(t) {
					var i = _toPrimitive(t, "string");
					return "symbol" == typeof i ? i : i + "";
				}
				function _toPrimitive(t, r) {
					if ("object" != typeof t || !t) return t;
					var e = t[Symbol.toPrimitive];
					if (void 0 !== e) {
						var i = e.call(t, r || "default");
						if ("object" != typeof i) return i;
						throw new TypeError("@@toPrimitive must return a primitive value.");
					}
					return ("string" === r ? String : Number)(t);
				}
				class EventEmitter {
					constructor() {
						_defineProperty(this, "listenersMap", /* @__PURE__ */ new Map());
					}
					addListener(event, listener) {
						const listeners = this.listenersMap.get(event);
						if (listeners === void 0) this.listenersMap.set(event, [listener]);
						else if (listeners.indexOf(listener) < 0) listeners.push(listener);
					}
					emit(event, ...args) {
						const listeners = this.listenersMap.get(event);
						if (listeners !== void 0) if (listeners.length === 1) listeners[0].apply(null, args);
						else {
							let didThrow = false;
							let caughtError = null;
							const clonedListeners = Array.from(listeners);
							for (let i = 0; i < clonedListeners.length; i++) {
								const listener = clonedListeners[i];
								try {
									listener.apply(null, args);
								} catch (error) {
									if (caughtError === null) {
										didThrow = true;
										caughtError = error;
									}
								}
							}
							if (didThrow) throw caughtError;
						}
					}
					removeAllListeners() {
						this.listenersMap.clear();
					}
					removeListener(event, listener) {
						const listeners = this.listenersMap.get(event);
						if (listeners !== void 0) {
							const index = listeners.indexOf(listener);
							if (index >= 0) listeners.splice(index, 1);
						}
					}
				}
				const TREE_OPERATION_ADD = 1;
				const TREE_OPERATION_REMOVE = 2;
				const TREE_OPERATION_REORDER_CHILDREN = 3;
				const TREE_OPERATION_UPDATE_TREE_BASE_DURATION = 4;
				const TREE_OPERATION_UPDATE_ERRORS_OR_WARNINGS = 5;
				const TREE_OPERATION_SET_SUBTREE_MODE = 7;
				const SUSPENSE_TREE_OPERATION_ADD = 8;
				const SUSPENSE_TREE_OPERATION_REMOVE = 9;
				const SUSPENSE_TREE_OPERATION_REORDER_CHILDREN = 10;
				const SUSPENSE_TREE_OPERATION_RESIZE = 11;
				const SUSPENSE_TREE_OPERATION_SUSPENDERS = 12;
				const PROFILING_FLAG_BASIC_SUPPORT = 1;
				const PROFILING_FLAG_TIMELINE_SUPPORT = 2;
				const PROFILING_FLAG_PERFORMANCE_TRACKS_SUPPORT = 4;
				const UNKNOWN_SUSPENDERS_NONE = 0;
				const UNKNOWN_SUSPENDERS_REASON_PRODUCTION = 1;
				const UNKNOWN_SUSPENDERS_REASON_OLD_VERSION = 2;
				const UNKNOWN_SUSPENDERS_REASON_THROWN_PROMISE = 3;
				const SESSION_STORAGE_LAST_SELECTION_KEY = "React::DevTools::lastSelection";
				const constants_SESSION_STORAGE_RECORD_CHANGE_DESCRIPTIONS_KEY = "React::DevTools::recordChangeDescriptions";
				const constants_SESSION_STORAGE_RECORD_TIMELINE_KEY = "React::DevTools::recordTimeline";
				const SESSION_STORAGE_RELOAD_AND_PROFILE_KEY = "React::DevTools::reloadAndProfile";
				const ANSI_STYLE_DIMMING_TEMPLATE = "\x1B[2;38;2;124;124;124m%s\x1B[0m";
				const ANSI_STYLE_DIMMING_TEMPLATE_WITH_COMPONENT_STACK = "\x1B[2;38;2;124;124;124m%s %o\x1B[0m";
				const compareVersions = (v1, v2) => {
					const n1 = validateAndParse(v1);
					const n2 = validateAndParse(v2);
					const p1 = n1.pop();
					const p2 = n2.pop();
					const r = compareSegments(n1, n2);
					if (r !== 0) return r;
					if (p1 && p2) return compareSegments(p1.split("."), p2.split("."));
					else if (p1 || p2) return p1 ? -1 : 1;
					return 0;
				};
				const semver = /^[v^~<>=]*?(\d+)(?:\.([x*]|\d+)(?:\.([x*]|\d+)(?:\.([x*]|\d+))?(?:-([\da-z\-]+(?:\.[\da-z\-]+)*))?(?:\+[\da-z\-]+(?:\.[\da-z\-]+)*)?)?)?$/i;
				const validateAndParse = (version) => {
					if (typeof version !== "string") throw new TypeError("Invalid argument expected string");
					const match = version.match(semver);
					if (!match) throw new Error(`Invalid argument not valid semver ('${version}' received)`);
					match.shift();
					return match;
				};
				const isWildcard = (s) => s === "*" || s === "x" || s === "X";
				const tryParse = (v) => {
					const n = parseInt(v, 10);
					return isNaN(n) ? v : n;
				};
				const forceType = (a, b) => typeof a !== typeof b ? [String(a), String(b)] : [a, b];
				const compareStrings = (a, b) => {
					if (isWildcard(a) || isWildcard(b)) return 0;
					const [ap, bp] = forceType(tryParse(a), tryParse(b));
					if (ap > bp) return 1;
					if (ap < bp) return -1;
					return 0;
				};
				const compareSegments = (a, b) => {
					for (let i = 0; i < Math.max(a.length, b.length); i++) {
						const r = compareStrings(a[i] || "0", b[i] || "0");
						if (r !== 0) return r;
					}
					return 0;
				};
				var lru_cache = __webpack_require__(3018);
				var lru_cache_default = /* @__PURE__ */ __webpack_require__.n(lru_cache);
				const REACT_LEGACY_ELEMENT_TYPE = Symbol.for("react.element");
				const REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element");
				const REACT_PORTAL_TYPE = Symbol.for("react.portal");
				const REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
				const REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode");
				const REACT_PROFILER_TYPE = Symbol.for("react.profiler");
				const REACT_CONSUMER_TYPE = Symbol.for("react.consumer");
				const REACT_CONTEXT_TYPE = Symbol.for("react.context");
				const REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
				const REACT_SUSPENSE_TYPE = Symbol.for("react.suspense");
				const REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list");
				const REACT_MEMO_TYPE = Symbol.for("react.memo");
				const REACT_LAZY_TYPE = Symbol.for("react.lazy");
				const REACT_TRACING_MARKER_TYPE = Symbol.for("react.tracing_marker");
				const REACT_MEMO_CACHE_SENTINEL = Symbol.for("react.memo_cache_sentinel");
				const REACT_VIEW_TRANSITION_TYPE = Symbol.for("react.view_transition");
				const types_ElementTypeClass = 1;
				const ElementTypeContext = 2;
				const types_ElementTypeFunction = 5;
				const types_ElementTypeForwardRef = 6;
				const ElementTypeHostComponent = 7;
				const types_ElementTypeMemo = 8;
				const ElementTypeOtherOrUnknown = 9;
				const ElementTypeProfiler = 10;
				const ElementTypeRoot = 11;
				const ElementTypeSuspense = 12;
				const ElementTypeSuspenseList = 13;
				const ElementTypeTracingMarker = 14;
				const types_ElementTypeVirtual = 15;
				const ElementTypeViewTransition = 16;
				const ElementTypeActivity = 17;
				const ComponentFilterElementType = 1;
				const ComponentFilterDisplayName = 2;
				const ComponentFilterLocation = 3;
				const ComponentFilterHOC = 4;
				const ComponentFilterEnvironmentName = 5;
				const StrictMode = 1;
				function storage_sessionStorageGetItem(key) {
					try {
						return sessionStorage.getItem(key);
					} catch (error) {
						return null;
					}
				}
				function sessionStorageRemoveItem(key) {
					try {
						sessionStorage.removeItem(key);
					} catch (error) {}
				}
				function sessionStorageSetItem(key, value) {
					try {
						return sessionStorage.setItem(key, value);
					} catch (error) {}
				}
				const src_isArray = Array.isArray;
				const utils_hasOwnProperty = Object.prototype.hasOwnProperty;
				const cachedDisplayNames = /* @__PURE__ */ new WeakMap();
				const encodedStringCache = new (lru_cache_default())({ max: 1e3 });
				const LEGACY_REACT_PROVIDER_TYPE = Symbol.for("react.provider");
				function alphaSortKeys(a, b) {
					if (a.toString() > b.toString()) return 1;
					else if (b.toString() > a.toString()) return -1;
					else return 0;
				}
				function getAllEnumerableKeys(obj) {
					const keys = /* @__PURE__ */ new Set();
					let current = obj;
					while (current != null) {
						const currentKeys = [...Object.keys(current), ...Object.getOwnPropertySymbols(current)];
						const descriptors = Object.getOwnPropertyDescriptors(current);
						currentKeys.forEach((key) => {
							if (descriptors[key].enumerable) keys.add(key);
						});
						current = Object.getPrototypeOf(current);
					}
					return keys;
				}
				function getWrappedDisplayName(outerType, innerType, wrapperName, fallbackName) {
					return outerType?.displayName || `${wrapperName}(${getDisplayName(innerType, fallbackName)})`;
				}
				function getDisplayName(type, fallbackName = "Anonymous") {
					const nameFromCache = cachedDisplayNames.get(type);
					if (nameFromCache != null) return nameFromCache;
					let displayName = fallbackName;
					if (typeof type.displayName === "string") displayName = type.displayName;
					else if (typeof type.name === "string" && type.name !== "") displayName = type.name;
					cachedDisplayNames.set(type, displayName);
					return displayName;
				}
				let uidCounter = 0;
				function getUID() {
					return ++uidCounter;
				}
				function surrogatePairToCodePoint(charCode1, charCode2) {
					return ((charCode1 & 1023) << 10) + (charCode2 & 1023) + 65536;
				}
				function utfEncodeString(string) {
					const cached = encodedStringCache.get(string);
					if (cached !== void 0) return cached;
					const encoded = [];
					let i = 0;
					let charCode;
					while (i < string.length) {
						charCode = string.charCodeAt(i);
						if ((charCode & 63488) === 55296) encoded.push(surrogatePairToCodePoint(charCode, string.charCodeAt(++i)));
						else encoded.push(charCode);
						++i;
					}
					encodedStringCache.set(string, encoded);
					return encoded;
				}
				function getDefaultComponentFilters() {
					return [{
						type: ComponentFilterElementType,
						value: ElementTypeHostComponent,
						isEnabled: true
					}];
				}
				function filterOutLocationComponentFilters(componentFilters) {
					if (!Array.isArray(componentFilters)) return componentFilters;
					return componentFilters.filter((f) => f.type !== ComponentFilterLocation);
				}
				function parseElementDisplayNameFromBackend(displayName, type) {
					if (displayName === null) return {
						formattedDisplayName: null,
						hocDisplayNames: null,
						compiledWithForget: false
					};
					if (displayName.startsWith("Forget(")) {
						const { formattedDisplayName, hocDisplayNames } = parseElementDisplayNameFromBackend(displayName.slice(7, displayName.length - 1), type);
						return {
							formattedDisplayName,
							hocDisplayNames,
							compiledWithForget: true
						};
					}
					let hocDisplayNames = null;
					switch (type) {
						case ElementTypeClass:
						case ElementTypeForwardRef:
						case ElementTypeFunction:
						case ElementTypeMemo:
						case ElementTypeVirtual:
							if (displayName.indexOf("(") >= 0) {
								const matches = displayName.match(/[^()]+/g);
								if (matches != null) {
									displayName = matches.pop();
									hocDisplayNames = matches;
								}
							}
							break;
						default: break;
					}
					return {
						formattedDisplayName: displayName,
						hocDisplayNames,
						compiledWithForget: false
					};
				}
				function utils_getInObject(object, path) {
					return path.reduce((reduced, attr) => {
						if (reduced) {
							if (utils_hasOwnProperty.call(reduced, attr)) return reduced[attr];
							if (typeof reduced[Symbol.iterator] === "function") return Array.from(reduced)[attr];
						}
						return null;
					}, object);
				}
				function deletePathInObject(object, path) {
					const length = path.length;
					const last = path[length - 1];
					if (object != null) {
						const parent = utils_getInObject(object, path.slice(0, length - 1));
						if (parent) if (src_isArray(parent)) parent.splice(last, 1);
						else delete parent[last];
					}
				}
				function renamePathInObject(object, oldPath, newPath) {
					const length = oldPath.length;
					if (object != null) {
						const parent = utils_getInObject(object, oldPath.slice(0, length - 1));
						if (parent) {
							const lastOld = oldPath[length - 1];
							const lastNew = newPath[length - 1];
							parent[lastNew] = parent[lastOld];
							if (src_isArray(parent)) parent.splice(lastOld, 1);
							else delete parent[lastOld];
						}
					}
				}
				function utils_setInObject(object, path, value) {
					const length = path.length;
					const last = path[length - 1];
					if (object != null) {
						const parent = utils_getInObject(object, path.slice(0, length - 1));
						if (parent) parent[last] = value;
					}
				}
				function isError(data) {
					if ("name" in data && "message" in data) while (data) {
						if (Object.prototype.toString.call(data) === "[object Error]") return true;
						data = Object.getPrototypeOf(data);
					}
					return false;
				}
				function getDataType(data) {
					if (data === null) return "null";
					else if (data === void 0) return "undefined";
					if (typeof HTMLElement !== "undefined" && data instanceof HTMLElement) return "html_element";
					switch (typeof data) {
						case "bigint": return "bigint";
						case "boolean": return "boolean";
						case "function": return "function";
						case "number": if (Number.isNaN(data)) return "nan";
						else if (!Number.isFinite(data)) return "infinity";
						else return "number";
						case "object":
							switch (data.$$typeof) {
								case REACT_ELEMENT_TYPE:
								case REACT_LEGACY_ELEMENT_TYPE: return "react_element";
								case REACT_LAZY_TYPE: return "react_lazy";
							}
							if (src_isArray(data)) return "array";
							else if (ArrayBuffer.isView(data)) return utils_hasOwnProperty.call(data.constructor, "BYTES_PER_ELEMENT") ? "typed_array" : "data_view";
							else if (data.constructor && data.constructor.name === "ArrayBuffer") return "array_buffer";
							else if (typeof data[Symbol.iterator] === "function") {
								const iterator = data[Symbol.iterator]();
								if (!iterator) {} else return iterator === data ? "opaque_iterator" : "iterator";
							} else if (data.constructor && data.constructor.name === "RegExp") return "regexp";
							else if (typeof data.then === "function") return "thenable";
							else if (isError(data)) return "error";
							else {
								const toStringValue = Object.prototype.toString.call(data);
								if (toStringValue === "[object Date]") return "date";
								else if (toStringValue === "[object HTMLAllCollection]") return "html_all_collection";
							}
							if (!isPlainObject(data)) return "class_instance";
							return "object";
						case "string": return "string";
						case "symbol": return "symbol";
						case "undefined":
							if (Object.prototype.toString.call(data) === "[object HTMLAllCollection]") return "html_all_collection";
							return "undefined";
						default: return "unknown";
					}
				}
				function typeOfWithLegacyElementSymbol(object) {
					if (typeof object === "object" && object !== null) {
						const $$typeof = object.$$typeof;
						switch ($$typeof) {
							case REACT_ELEMENT_TYPE:
							case REACT_LEGACY_ELEMENT_TYPE:
								const type = object.type;
								switch (type) {
									case REACT_FRAGMENT_TYPE:
									case REACT_PROFILER_TYPE:
									case REACT_STRICT_MODE_TYPE:
									case REACT_SUSPENSE_TYPE:
									case REACT_SUSPENSE_LIST_TYPE:
									case REACT_VIEW_TRANSITION_TYPE: return type;
									default:
										const $$typeofType = type && type.$$typeof;
										switch ($$typeofType) {
											case REACT_CONTEXT_TYPE:
											case REACT_FORWARD_REF_TYPE:
											case REACT_LAZY_TYPE:
											case REACT_MEMO_TYPE: return $$typeofType;
											case REACT_CONSUMER_TYPE: return $$typeofType;
											default: return $$typeof;
										}
								}
							case REACT_PORTAL_TYPE: return $$typeof;
						}
					}
				}
				function getDisplayNameForReactElement(element) {
					switch (typeOfWithLegacyElementSymbol(element)) {
						case REACT_CONSUMER_TYPE: return "ContextConsumer";
						case LEGACY_REACT_PROVIDER_TYPE: return "ContextProvider";
						case REACT_CONTEXT_TYPE: return "Context";
						case REACT_FORWARD_REF_TYPE: return "ForwardRef";
						case REACT_FRAGMENT_TYPE: return "Fragment";
						case REACT_LAZY_TYPE: return "Lazy";
						case REACT_MEMO_TYPE: return "Memo";
						case REACT_PORTAL_TYPE: return "Portal";
						case REACT_PROFILER_TYPE: return "Profiler";
						case REACT_STRICT_MODE_TYPE: return "StrictMode";
						case REACT_SUSPENSE_TYPE: return "Suspense";
						case REACT_SUSPENSE_LIST_TYPE: return "SuspenseList";
						case REACT_VIEW_TRANSITION_TYPE: return "ViewTransition";
						case REACT_TRACING_MARKER_TYPE: return "TracingMarker";
						default:
							const { type } = element;
							if (typeof type === "string") return type;
							else if (typeof type === "function") return getDisplayName(type, "Anonymous");
							else if (type != null) return "NotImplementedInDevtools";
							else return "Element";
					}
				}
				const MAX_PREVIEW_STRING_LENGTH = 50;
				function truncateForDisplay(string, length = MAX_PREVIEW_STRING_LENGTH) {
					if (string.length > length) return string.slice(0, length) + "…";
					else return string;
				}
				function formatDataForPreview(data, showFormattedValue) {
					if (data != null && utils_hasOwnProperty.call(data, meta.type)) return showFormattedValue ? data[meta.preview_long] : data[meta.preview_short];
					switch (getDataType(data)) {
						case "html_element": return `<${truncateForDisplay(data.tagName.toLowerCase())} />`;
						case "function":
							if (typeof data.name === "function" || data.name === "") return "() => {}";
							return `${truncateForDisplay(data.name)}() {}`;
						case "string": return `"${data}"`;
						case "bigint": return truncateForDisplay(data.toString() + "n");
						case "regexp": return truncateForDisplay(data.toString());
						case "symbol": return truncateForDisplay(data.toString());
						case "react_element": return `<${truncateForDisplay(getDisplayNameForReactElement(data) || "Unknown")} />`;
						case "react_lazy":
							const payload = data._payload;
							if (payload !== null && typeof payload === "object") {
								if (payload._status === 0) return `pending lazy()`;
								if (payload._status === 1 && payload._result != null) if (showFormattedValue) return `fulfilled lazy() {${truncateForDisplay(formatDataForPreview(payload._result.default, false))}}`;
								else return `fulfilled lazy() {…}`;
								if (payload._status === 2) if (showFormattedValue) return `rejected lazy() {${truncateForDisplay(formatDataForPreview(payload._result, false))}}`;
								else return `rejected lazy() {…}`;
								if (payload.status === "pending" || payload.status === "blocked") return `pending lazy()`;
								if (payload.status === "fulfilled") if (showFormattedValue) return `fulfilled lazy() {${truncateForDisplay(formatDataForPreview(payload.value, false))}}`;
								else return `fulfilled lazy() {…}`;
								if (payload.status === "rejected") if (showFormattedValue) return `rejected lazy() {${truncateForDisplay(formatDataForPreview(payload.reason, false))}}`;
								else return `rejected lazy() {…}`;
							}
							return "lazy()";
						case "array_buffer": return `ArrayBuffer(${data.byteLength})`;
						case "data_view": return `DataView(${data.buffer.byteLength})`;
						case "array": if (showFormattedValue) {
							let formatted = "";
							for (let i = 0; i < data.length; i++) {
								if (i > 0) formatted += ", ";
								formatted += formatDataForPreview(data[i], false);
								if (formatted.length > MAX_PREVIEW_STRING_LENGTH) break;
							}
							return `[${truncateForDisplay(formatted)}]`;
						} else return `Array(${utils_hasOwnProperty.call(data, meta.size) ? data[meta.size] : data.length})`;
						case "typed_array":
							const shortName = `${data.constructor.name}(${data.length})`;
							if (showFormattedValue) {
								let formatted = "";
								for (let i = 0; i < data.length; i++) {
									if (i > 0) formatted += ", ";
									formatted += data[i];
									if (formatted.length > MAX_PREVIEW_STRING_LENGTH) break;
								}
								return `${shortName} [${truncateForDisplay(formatted)}]`;
							} else return shortName;
						case "iterator":
							const name = data.constructor.name;
							if (showFormattedValue) {
								const array = Array.from(data);
								let formatted = "";
								for (let i = 0; i < array.length; i++) {
									const entryOrEntries = array[i];
									if (i > 0) formatted += ", ";
									if (src_isArray(entryOrEntries)) {
										const key = formatDataForPreview(entryOrEntries[0], true);
										const value = formatDataForPreview(entryOrEntries[1], false);
										formatted += `${key} => ${value}`;
									} else formatted += formatDataForPreview(entryOrEntries, false);
									if (formatted.length > MAX_PREVIEW_STRING_LENGTH) break;
								}
								return `${name}(${data.size}) {${truncateForDisplay(formatted)}}`;
							} else return `${name}(${data.size})`;
						case "opaque_iterator": return data[Symbol.toStringTag];
						case "date": return data.toString();
						case "class_instance": try {
							let resolvedConstructorName = data.constructor.name;
							if (typeof resolvedConstructorName === "string") return resolvedConstructorName;
							resolvedConstructorName = Object.getPrototypeOf(data).constructor.name;
							if (typeof resolvedConstructorName === "string") return resolvedConstructorName;
							try {
								return truncateForDisplay(String(data));
							} catch (error) {
								return "unserializable";
							}
						} catch (error) {
							return "unserializable";
						}
						case "thenable":
							let displayName;
							if (isPlainObject(data)) displayName = "Thenable";
							else {
								let resolvedConstructorName = data.constructor.name;
								if (typeof resolvedConstructorName !== "string") resolvedConstructorName = Object.getPrototypeOf(data).constructor.name;
								if (typeof resolvedConstructorName === "string") displayName = resolvedConstructorName;
								else displayName = "Thenable";
							}
							switch (data.status) {
								case "pending": return `pending ${displayName}`;
								case "fulfilled": if (showFormattedValue) {
									const formatted = formatDataForPreview(data.value, false);
									return `fulfilled ${displayName} {${truncateForDisplay(formatted)}}`;
								} else return `fulfilled ${displayName} {…}`;
								case "rejected": if (showFormattedValue) {
									const formatted = formatDataForPreview(data.reason, false);
									return `rejected ${displayName} {${truncateForDisplay(formatted)}}`;
								} else return `rejected ${displayName} {…}`;
								default: return displayName;
							}
						case "object": if (showFormattedValue) {
							const keys = Array.from(getAllEnumerableKeys(data)).sort(alphaSortKeys);
							let formatted = "";
							for (let i = 0; i < keys.length; i++) {
								const key = keys[i];
								if (i > 0) formatted += ", ";
								formatted += `${key.toString()}: ${formatDataForPreview(data[key], false)}`;
								if (formatted.length > MAX_PREVIEW_STRING_LENGTH) break;
							}
							return `{${truncateForDisplay(formatted)}}`;
						} else return "{…}";
						case "error": return truncateForDisplay(String(data));
						case "boolean":
						case "number":
						case "infinity":
						case "nan":
						case "null":
						case "undefined": return String(data);
						default: try {
							return truncateForDisplay(String(data));
						} catch (error) {
							return "unserializable";
						}
					}
				}
				const isPlainObject = (object) => {
					const objectPrototype = Object.getPrototypeOf(object);
					if (!objectPrototype) return true;
					return !Object.getPrototypeOf(objectPrototype);
				};
				function getIsReloadAndProfileSupported() {
					let isBackendStorageAPISupported = false;
					try {
						localStorage.getItem("test");
						isBackendStorageAPISupported = true;
					} catch (error) {}
					return isBackendStorageAPISupported && isSynchronousXHRSupported();
				}
				function getIfReloadedAndProfiling() {
					return storage_sessionStorageGetItem(SESSION_STORAGE_RELOAD_AND_PROFILE_KEY) === "true";
				}
				function onReloadAndProfile(recordChangeDescriptions, recordTimeline) {
					sessionStorageSetItem(SESSION_STORAGE_RELOAD_AND_PROFILE_KEY, "true");
					sessionStorageSetItem(constants_SESSION_STORAGE_RECORD_CHANGE_DESCRIPTIONS_KEY, recordChangeDescriptions ? "true" : "false");
					sessionStorageSetItem(constants_SESSION_STORAGE_RECORD_TIMELINE_KEY, recordTimeline ? "true" : "false");
				}
				function onReloadAndProfileFlagsReset() {
					sessionStorageRemoveItem(SESSION_STORAGE_RELOAD_AND_PROFILE_KEY);
					sessionStorageRemoveItem(constants_SESSION_STORAGE_RECORD_CHANGE_DESCRIPTIONS_KEY);
					sessionStorageRemoveItem(constants_SESSION_STORAGE_RECORD_TIMELINE_KEY);
				}
				function noop() {}
				const meta = {
					inspectable: Symbol("inspectable"),
					inspected: Symbol("inspected"),
					name: Symbol("name"),
					preview_long: Symbol("preview_long"),
					preview_short: Symbol("preview_short"),
					readonly: Symbol("readonly"),
					size: Symbol("size"),
					type: Symbol("type"),
					unserializable: Symbol("unserializable")
				};
				const LEVEL_THRESHOLD = 2;
				function createDehydrated(type, inspectable, data, cleaned, path) {
					cleaned.push(path);
					const dehydrated = {
						inspectable,
						type,
						preview_long: formatDataForPreview(data, true),
						preview_short: formatDataForPreview(data, false),
						name: typeof data.constructor !== "function" || typeof data.constructor.name !== "string" || data.constructor.name === "Object" ? "" : data.constructor.name
					};
					if (type === "array" || type === "typed_array") dehydrated.size = data.length;
					else if (type === "object") dehydrated.size = Object.keys(data).length;
					if (type === "iterator" || type === "typed_array") dehydrated.readonly = true;
					return dehydrated;
				}
				function dehydrate(data, cleaned, unserializable, path, isPathAllowed, level = 0) {
					const type = getDataType(data);
					let isPathAllowedCheck;
					switch (type) {
						case "html_element":
							cleaned.push(path);
							return {
								inspectable: false,
								preview_short: formatDataForPreview(data, false),
								preview_long: formatDataForPreview(data, true),
								name: data.tagName,
								type
							};
						case "function":
							cleaned.push(path);
							return {
								inspectable: false,
								preview_short: formatDataForPreview(data, false),
								preview_long: formatDataForPreview(data, true),
								name: typeof data.name === "function" || !data.name ? "function" : data.name,
								type
							};
						case "string":
							isPathAllowedCheck = isPathAllowed(path);
							if (isPathAllowedCheck) return data;
							else return data.length <= 500 ? data : data.slice(0, 500) + "...";
						case "bigint":
							cleaned.push(path);
							return {
								inspectable: false,
								preview_short: formatDataForPreview(data, false),
								preview_long: formatDataForPreview(data, true),
								name: data.toString(),
								type
							};
						case "symbol":
							cleaned.push(path);
							return {
								inspectable: false,
								preview_short: formatDataForPreview(data, false),
								preview_long: formatDataForPreview(data, true),
								name: data.toString(),
								type
							};
						case "react_element": {
							isPathAllowedCheck = isPathAllowed(path);
							if (level >= LEVEL_THRESHOLD && !isPathAllowedCheck) {
								cleaned.push(path);
								return {
									inspectable: true,
									preview_short: formatDataForPreview(data, false),
									preview_long: formatDataForPreview(data, true),
									name: getDisplayNameForReactElement(data) || "Unknown",
									type
								};
							}
							const unserializableValue = {
								unserializable: true,
								type,
								readonly: true,
								preview_short: formatDataForPreview(data, false),
								preview_long: formatDataForPreview(data, true),
								name: getDisplayNameForReactElement(data) || "Unknown"
							};
							unserializableValue.key = dehydrate(data.key, cleaned, unserializable, path.concat(["key"]), isPathAllowed, isPathAllowedCheck ? 1 : level + 1);
							if (data.$$typeof === REACT_LEGACY_ELEMENT_TYPE) unserializableValue.ref = dehydrate(data.ref, cleaned, unserializable, path.concat(["ref"]), isPathAllowed, isPathAllowedCheck ? 1 : level + 1);
							unserializableValue.props = dehydrate(data.props, cleaned, unserializable, path.concat(["props"]), isPathAllowed, isPathAllowedCheck ? 1 : level + 1);
							unserializable.push(path);
							return unserializableValue;
						}
						case "react_lazy": {
							isPathAllowedCheck = isPathAllowed(path);
							const payload = data._payload;
							if (level >= LEVEL_THRESHOLD && !isPathAllowedCheck) {
								cleaned.push(path);
								return {
									inspectable: payload !== null && typeof payload === "object" && (payload._status === 1 || payload._status === 2 || payload.status === "fulfilled" || payload.status === "rejected"),
									preview_short: formatDataForPreview(data, false),
									preview_long: formatDataForPreview(data, true),
									name: "lazy()",
									type
								};
							}
							const unserializableValue = {
								unserializable: true,
								type,
								preview_short: formatDataForPreview(data, false),
								preview_long: formatDataForPreview(data, true),
								name: "lazy()"
							};
							unserializableValue._payload = dehydrate(payload, cleaned, unserializable, path.concat(["_payload"]), isPathAllowed, isPathAllowedCheck ? 1 : level + 1);
							unserializable.push(path);
							return unserializableValue;
						}
						case "array_buffer":
						case "data_view":
							cleaned.push(path);
							return {
								inspectable: false,
								preview_short: formatDataForPreview(data, false),
								preview_long: formatDataForPreview(data, true),
								name: type === "data_view" ? "DataView" : "ArrayBuffer",
								size: data.byteLength,
								type
							};
						case "array":
							isPathAllowedCheck = isPathAllowed(path);
							if (level >= LEVEL_THRESHOLD && !isPathAllowedCheck) return createDehydrated(type, true, data, cleaned, path);
							const arr = [];
							for (let i = 0; i < data.length; i++) arr[i] = dehydrateKey(data, i, cleaned, unserializable, path.concat([i]), isPathAllowed, isPathAllowedCheck ? 1 : level + 1);
							return arr;
						case "html_all_collection":
						case "typed_array":
						case "iterator":
							isPathAllowedCheck = isPathAllowed(path);
							if (level >= LEVEL_THRESHOLD && !isPathAllowedCheck) return createDehydrated(type, true, data, cleaned, path);
							else {
								const unserializableValue = {
									unserializable: true,
									type,
									readonly: true,
									size: type === "typed_array" ? data.length : void 0,
									preview_short: formatDataForPreview(data, false),
									preview_long: formatDataForPreview(data, true),
									name: typeof data.constructor !== "function" || typeof data.constructor.name !== "string" || data.constructor.name === "Object" ? "" : data.constructor.name
								};
								Array.from(data).forEach((item, i) => unserializableValue[i] = dehydrate(item, cleaned, unserializable, path.concat([i]), isPathAllowed, isPathAllowedCheck ? 1 : level + 1));
								unserializable.push(path);
								return unserializableValue;
							}
						case "opaque_iterator":
							cleaned.push(path);
							return {
								inspectable: false,
								preview_short: formatDataForPreview(data, false),
								preview_long: formatDataForPreview(data, true),
								name: data[Symbol.toStringTag],
								type
							};
						case "date":
							cleaned.push(path);
							return {
								inspectable: false,
								preview_short: formatDataForPreview(data, false),
								preview_long: formatDataForPreview(data, true),
								name: data.toString(),
								type
							};
						case "regexp":
							cleaned.push(path);
							return {
								inspectable: false,
								preview_short: formatDataForPreview(data, false),
								preview_long: formatDataForPreview(data, true),
								name: data.toString(),
								type
							};
						case "thenable":
							isPathAllowedCheck = isPathAllowed(path);
							if (level >= LEVEL_THRESHOLD && !isPathAllowedCheck) {
								cleaned.push(path);
								return {
									inspectable: data.status === "fulfilled" || data.status === "rejected",
									preview_short: formatDataForPreview(data, false),
									preview_long: formatDataForPreview(data, true),
									name: data.toString(),
									type
								};
							}
							if (data.status === "resolved_model" || data.status === "resolve_module") data.then(noop);
							switch (data.status) {
								case "fulfilled": {
									const unserializableValue = {
										unserializable: true,
										type,
										preview_short: formatDataForPreview(data, false),
										preview_long: formatDataForPreview(data, true),
										name: "fulfilled Thenable"
									};
									unserializableValue.value = dehydrate(data.value, cleaned, unserializable, path.concat(["value"]), isPathAllowed, isPathAllowedCheck ? 1 : level + 1);
									unserializable.push(path);
									return unserializableValue;
								}
								case "rejected": {
									const unserializableValue = {
										unserializable: true,
										type,
										preview_short: formatDataForPreview(data, false),
										preview_long: formatDataForPreview(data, true),
										name: "rejected Thenable"
									};
									unserializableValue.reason = dehydrate(data.reason, cleaned, unserializable, path.concat(["reason"]), isPathAllowed, isPathAllowedCheck ? 1 : level + 1);
									unserializable.push(path);
									return unserializableValue;
								}
								default:
									cleaned.push(path);
									return {
										inspectable: false,
										preview_short: formatDataForPreview(data, false),
										preview_long: formatDataForPreview(data, true),
										name: data.toString(),
										type
									};
							}
						case "object":
							isPathAllowedCheck = isPathAllowed(path);
							if (level >= LEVEL_THRESHOLD && !isPathAllowedCheck) return createDehydrated(type, true, data, cleaned, path);
							else {
								const object = {};
								getAllEnumerableKeys(data).forEach((key) => {
									const name = key.toString();
									object[name] = dehydrateKey(data, key, cleaned, unserializable, path.concat([name]), isPathAllowed, isPathAllowedCheck ? 1 : level + 1);
								});
								return object;
							}
						case "class_instance": {
							isPathAllowedCheck = isPathAllowed(path);
							if (level >= LEVEL_THRESHOLD && !isPathAllowedCheck) return createDehydrated(type, true, data, cleaned, path);
							const value = {
								unserializable: true,
								type,
								readonly: true,
								preview_short: formatDataForPreview(data, false),
								preview_long: formatDataForPreview(data, true),
								name: typeof data.constructor !== "function" || typeof data.constructor.name !== "string" ? "" : data.constructor.name
							};
							getAllEnumerableKeys(data).forEach((key) => {
								const keyAsString = key.toString();
								value[keyAsString] = dehydrate(data[key], cleaned, unserializable, path.concat([keyAsString]), isPathAllowed, isPathAllowedCheck ? 1 : level + 1);
							});
							unserializable.push(path);
							return value;
						}
						case "error": {
							isPathAllowedCheck = isPathAllowed(path);
							if (level >= LEVEL_THRESHOLD && !isPathAllowedCheck) return createDehydrated(type, true, data, cleaned, path);
							const value = {
								unserializable: true,
								type,
								readonly: true,
								preview_short: formatDataForPreview(data, false),
								preview_long: formatDataForPreview(data, true),
								name: data.name
							};
							value.message = dehydrate(data.message, cleaned, unserializable, path.concat(["message"]), isPathAllowed, isPathAllowedCheck ? 1 : level + 1);
							value.stack = dehydrate(data.stack, cleaned, unserializable, path.concat(["stack"]), isPathAllowed, isPathAllowedCheck ? 1 : level + 1);
							if ("cause" in data) value.cause = dehydrate(data.cause, cleaned, unserializable, path.concat(["cause"]), isPathAllowed, isPathAllowedCheck ? 1 : level + 1);
							getAllEnumerableKeys(data).forEach((key) => {
								const keyAsString = key.toString();
								value[keyAsString] = dehydrate(data[key], cleaned, unserializable, path.concat([keyAsString]), isPathAllowed, isPathAllowedCheck ? 1 : level + 1);
							});
							unserializable.push(path);
							return value;
						}
						case "infinity":
						case "nan":
						case "undefined":
							cleaned.push(path);
							return { type };
						default: return data;
					}
				}
				function dehydrateKey(parent, key, cleaned, unserializable, path, isPathAllowed, level = 0) {
					try {
						return dehydrate(parent[key], cleaned, unserializable, path, isPathAllowed, level);
					} catch (error) {
						let preview = "";
						if (typeof error === "object" && error !== null && typeof error.stack === "string") preview = error.stack;
						else if (typeof error === "string") preview = error;
						cleaned.push(path);
						return {
							inspectable: false,
							preview_short: "[Exception]",
							preview_long: preview ? "[Exception: " + preview + "]" : "[Exception]",
							name: preview,
							type: "unknown"
						};
					}
				}
				const isArrayImpl = Array.isArray;
				function isArray_isArray(a) {
					return isArrayImpl(a);
				}
				const shared_isArray = isArray_isArray;
				const FIRST_DEVTOOLS_BACKEND_LOCKSTEP_VER = "999.9.9";
				function hasAssignedBackend(version) {
					if (version == null || version === "") return false;
					return gte(version, FIRST_DEVTOOLS_BACKEND_LOCKSTEP_VER);
				}
				function cleanForBridge(data, isPathAllowed, path = []) {
					if (data !== null) {
						const cleanedPaths = [];
						const unserializablePaths = [];
						return {
							data: dehydrate(data, cleanedPaths, unserializablePaths, path, isPathAllowed),
							cleaned: cleanedPaths,
							unserializable: unserializablePaths
						};
					} else return null;
				}
				function copyWithDelete(obj, path, index = 0) {
					const key = path[index];
					const updated = shared_isArray(obj) ? obj.slice() : { ...obj };
					if (index + 1 === path.length) if (shared_isArray(updated)) updated.splice(key, 1);
					else delete updated[key];
					else updated[key] = copyWithDelete(obj[key], path, index + 1);
					return updated;
				}
				function copyWithRename(obj, oldPath, newPath, index = 0) {
					const oldKey = oldPath[index];
					const updated = shared_isArray(obj) ? obj.slice() : { ...obj };
					if (index + 1 === oldPath.length) {
						const newKey = newPath[index];
						updated[newKey] = updated[oldKey];
						if (shared_isArray(updated)) updated.splice(oldKey, 1);
						else delete updated[oldKey];
					} else updated[oldKey] = copyWithRename(obj[oldKey], oldPath, newPath, index + 1);
					return updated;
				}
				function copyWithSet(obj, path, value, index = 0) {
					if (index >= path.length) return value;
					const key = path[index];
					const updated = shared_isArray(obj) ? obj.slice() : { ...obj };
					updated[key] = copyWithSet(obj[key], path, value, index + 1);
					return updated;
				}
				function getEffectDurations(root) {
					let effectDuration = null;
					let passiveEffectDuration = null;
					const hostRoot = root.current;
					if (hostRoot != null) {
						const stateNode = hostRoot.stateNode;
						if (stateNode != null) {
							effectDuration = stateNode.effectDuration != null ? stateNode.effectDuration : null;
							passiveEffectDuration = stateNode.passiveEffectDuration != null ? stateNode.passiveEffectDuration : null;
						}
					}
					return {
						effectDuration,
						passiveEffectDuration
					};
				}
				function serializeToString(data) {
					if (data === void 0) return "undefined";
					if (typeof data === "function") return data.toString();
					const cache = /* @__PURE__ */ new Set();
					return JSON.stringify(data, (key, value) => {
						if (typeof value === "object" && value !== null) {
							if (cache.has(value)) return;
							cache.add(value);
						}
						if (typeof value === "bigint") return value.toString() + "n";
						return value;
					}, 2);
				}
				function safeToString(val) {
					try {
						return String(val);
					} catch (err) {
						if (typeof val === "object") return "[object Object]";
						throw err;
					}
				}
				function formatConsoleArgumentsToSingleString(maybeMessage, ...inputArgs) {
					const args = inputArgs.slice();
					let formatted = safeToString(maybeMessage);
					if (typeof maybeMessage === "string") {
						if (args.length) formatted = formatted.replace(/(%?)(%([jds]))/g, (match, escaped, ptn, flag) => {
							let arg = args.shift();
							switch (flag) {
								case "s":
									arg += "";
									break;
								case "d":
								case "i":
									arg = parseInt(arg, 10).toString();
									break;
								case "f":
									arg = parseFloat(arg).toString();
									break;
							}
							if (!escaped) return arg;
							args.unshift(arg);
							return match;
						});
					}
					if (args.length) for (let i = 0; i < args.length; i++) formatted += " " + safeToString(args[i]);
					formatted = formatted.replace(/%{2,2}/g, "%");
					return String(formatted);
				}
				function isSynchronousXHRSupported() {
					return !!(window.document && window.document.featurePolicy && window.document.featurePolicy.allowsFeature("sync-xhr"));
				}
				function gt(a = "", b = "") {
					return compareVersions(a, b) === 1;
				}
				function gte(a = "", b = "") {
					return compareVersions(a, b) > -1;
				}
				const isReactNativeEnvironment = () => {
					return window.document == null;
				};
				function formatDurationToMicrosecondsGranularity(duration) {
					return Math.round(duration * 1e3) / 1e3;
				}
				function getOwnerWindow(node) {
					if (!node.ownerDocument) return null;
					return node.ownerDocument.defaultView;
				}
				function getOwnerIframe(node) {
					const nodeWindow = getOwnerWindow(node);
					if (nodeWindow) return nodeWindow.frameElement;
					return null;
				}
				function getBoundingClientRectWithBorderOffset(node) {
					const dimensions = getElementDimensions(node);
					return mergeRectOffsets([node.getBoundingClientRect(), {
						top: dimensions.borderTop,
						left: dimensions.borderLeft,
						bottom: dimensions.borderBottom,
						right: dimensions.borderRight,
						width: 0,
						height: 0
					}]);
				}
				function mergeRectOffsets(rects) {
					return rects.reduce((previousRect, rect) => {
						if (previousRect == null) return rect;
						return {
							top: previousRect.top + rect.top,
							left: previousRect.left + rect.left,
							width: previousRect.width,
							height: previousRect.height,
							bottom: previousRect.bottom + rect.bottom,
							right: previousRect.right + rect.right
						};
					});
				}
				function getNestedBoundingClientRect(node, boundaryWindow) {
					const ownerIframe = getOwnerIframe(node);
					if (ownerIframe && ownerIframe !== boundaryWindow) {
						const rects = [node.getBoundingClientRect()];
						let currentIframe = ownerIframe;
						let onlyOneMore = false;
						while (currentIframe) {
							const rect = getBoundingClientRectWithBorderOffset(currentIframe);
							rects.push(rect);
							currentIframe = getOwnerIframe(currentIframe);
							if (onlyOneMore) break;
							if (currentIframe && getOwnerWindow(currentIframe) === boundaryWindow) onlyOneMore = true;
						}
						return mergeRectOffsets(rects);
					} else return node.getBoundingClientRect();
				}
				function getElementDimensions(domElement) {
					const calculatedStyle = window.getComputedStyle(domElement);
					return {
						borderLeft: parseInt(calculatedStyle.borderLeftWidth, 10),
						borderRight: parseInt(calculatedStyle.borderRightWidth, 10),
						borderTop: parseInt(calculatedStyle.borderTopWidth, 10),
						borderBottom: parseInt(calculatedStyle.borderBottomWidth, 10),
						marginLeft: parseInt(calculatedStyle.marginLeft, 10),
						marginRight: parseInt(calculatedStyle.marginRight, 10),
						marginTop: parseInt(calculatedStyle.marginTop, 10),
						marginBottom: parseInt(calculatedStyle.marginBottom, 10),
						paddingLeft: parseInt(calculatedStyle.paddingLeft, 10),
						paddingRight: parseInt(calculatedStyle.paddingRight, 10),
						paddingTop: parseInt(calculatedStyle.paddingTop, 10),
						paddingBottom: parseInt(calculatedStyle.paddingBottom, 10)
					};
				}
				function extractHOCNames(displayName) {
					if (!displayName) return {
						baseComponentName: "",
						hocNames: []
					};
					const hocRegex = /([A-Z][a-zA-Z0-9]*?)\((.*)\)/g;
					const hocNames = [];
					let baseComponentName = displayName;
					let match;
					while ((match = hocRegex.exec(baseComponentName)) != null) if (Array.isArray(match)) {
						const [, hocName, inner] = match;
						hocNames.push(hocName);
						baseComponentName = inner;
					}
					return {
						baseComponentName,
						hocNames
					};
				}
				const Overlay_assign = Object.assign;
				class OverlayRect {
					constructor(doc, container) {
						this.node = doc.createElement("div");
						this.border = doc.createElement("div");
						this.padding = doc.createElement("div");
						this.content = doc.createElement("div");
						this.border.style.borderColor = overlayStyles.border;
						this.padding.style.borderColor = overlayStyles.padding;
						this.content.style.backgroundColor = overlayStyles.background;
						Overlay_assign(this.node.style, {
							borderColor: overlayStyles.margin,
							pointerEvents: "none",
							position: "fixed"
						});
						this.node.style.zIndex = "10000000";
						this.node.appendChild(this.border);
						this.border.appendChild(this.padding);
						this.padding.appendChild(this.content);
						container.appendChild(this.node);
					}
					remove() {
						if (this.node.parentNode) this.node.parentNode.removeChild(this.node);
					}
					update(box, dims) {
						boxWrap(dims, "margin", this.node);
						boxWrap(dims, "border", this.border);
						boxWrap(dims, "padding", this.padding);
						Overlay_assign(this.content.style, {
							height: box.height - dims.borderTop - dims.borderBottom - dims.paddingTop - dims.paddingBottom + "px",
							width: box.width - dims.borderLeft - dims.borderRight - dims.paddingLeft - dims.paddingRight + "px"
						});
						Overlay_assign(this.node.style, {
							top: box.top - dims.marginTop + "px",
							left: box.left - dims.marginLeft + "px"
						});
					}
				}
				class OverlayTip {
					constructor(doc, container) {
						this.tip = doc.createElement("div");
						Overlay_assign(this.tip.style, {
							display: "flex",
							flexFlow: "row nowrap",
							backgroundColor: "#333740",
							borderRadius: "2px",
							fontFamily: "\"SFMono-Regular\", Consolas, \"Liberation Mono\", Menlo, Courier, monospace",
							fontWeight: "bold",
							padding: "3px 5px",
							pointerEvents: "none",
							position: "fixed",
							fontSize: "12px",
							whiteSpace: "nowrap"
						});
						this.nameSpan = doc.createElement("span");
						this.tip.appendChild(this.nameSpan);
						Overlay_assign(this.nameSpan.style, {
							color: "#ee78e6",
							borderRight: "1px solid #aaaaaa",
							paddingRight: "0.5rem",
							marginRight: "0.5rem"
						});
						this.dimSpan = doc.createElement("span");
						this.tip.appendChild(this.dimSpan);
						Overlay_assign(this.dimSpan.style, { color: "#d7d7d7" });
						this.tip.style.zIndex = "10000000";
						container.appendChild(this.tip);
					}
					remove() {
						if (this.tip.parentNode) this.tip.parentNode.removeChild(this.tip);
					}
					updateText(name, width, height) {
						this.nameSpan.textContent = name;
						this.dimSpan.textContent = Math.round(width) + "px × " + Math.round(height) + "px";
					}
					updatePosition(dims, bounds) {
						const tipRect = this.tip.getBoundingClientRect();
						const tipPos = findTipPos(dims, bounds, {
							width: tipRect.width,
							height: tipRect.height
						});
						Overlay_assign(this.tip.style, tipPos.style);
					}
				}
				class Overlay {
					constructor(agent) {
						const currentWindow = window.__REACT_DEVTOOLS_TARGET_WINDOW__ || window;
						this.window = currentWindow;
						this.tipBoundsWindow = window.__REACT_DEVTOOLS_TARGET_WINDOW__ || window;
						const doc = currentWindow.document;
						this.container = doc.createElement("div");
						this.container.style.zIndex = "10000000";
						this.tip = new OverlayTip(doc, this.container);
						this.rects = [];
						this.agent = agent;
						doc.body.appendChild(this.container);
					}
					remove() {
						this.tip.remove();
						this.rects.forEach((rect) => {
							rect.remove();
						});
						this.rects.length = 0;
						if (this.container.parentNode) this.container.parentNode.removeChild(this.container);
					}
					inspect(nodes, name) {
						const elements = nodes.filter((node) => node.nodeType === Node.ELEMENT_NODE);
						while (this.rects.length > elements.length) this.rects.pop().remove();
						if (elements.length === 0) return;
						while (this.rects.length < elements.length) this.rects.push(new OverlayRect(this.window.document, this.container));
						const outerBox = {
							top: Number.POSITIVE_INFINITY,
							right: Number.NEGATIVE_INFINITY,
							bottom: Number.NEGATIVE_INFINITY,
							left: Number.POSITIVE_INFINITY
						};
						elements.forEach((element, index) => {
							const box = getNestedBoundingClientRect(element, this.window);
							const dims = getElementDimensions(element);
							outerBox.top = Math.min(outerBox.top, box.top - dims.marginTop);
							outerBox.right = Math.max(outerBox.right, box.left + box.width + dims.marginRight);
							outerBox.bottom = Math.max(outerBox.bottom, box.top + box.height + dims.marginBottom);
							outerBox.left = Math.min(outerBox.left, box.left - dims.marginLeft);
							this.rects[index].update(box, dims);
						});
						if (!name) {
							name = elements[0].nodeName.toLowerCase();
							const node = elements[0];
							const ownerName = this.agent.getComponentNameForHostInstance(node);
							if (ownerName) name += " (in " + ownerName + ")";
						}
						this.tip.updateText(name, outerBox.right - outerBox.left, outerBox.bottom - outerBox.top);
						const tipBounds = getNestedBoundingClientRect(this.tipBoundsWindow.document.documentElement, this.window);
						this.tip.updatePosition({
							top: outerBox.top,
							left: outerBox.left,
							height: outerBox.bottom - outerBox.top,
							width: outerBox.right - outerBox.left
						}, {
							top: tipBounds.top + this.tipBoundsWindow.scrollY,
							left: tipBounds.left + this.tipBoundsWindow.scrollX,
							height: this.tipBoundsWindow.innerHeight,
							width: this.tipBoundsWindow.innerWidth
						});
					}
				}
				function findTipPos(dims, bounds, tipSize) {
					const tipHeight = Math.max(tipSize.height, 20);
					const tipWidth = Math.max(tipSize.width, 60);
					const margin = 5;
					let top;
					if (dims.top + dims.height + tipHeight <= bounds.top + bounds.height) if (dims.top + dims.height < bounds.top + 0) top = bounds.top + margin;
					else top = dims.top + dims.height + margin;
					else if (dims.top - tipHeight <= bounds.top + bounds.height) if (dims.top - tipHeight - margin < bounds.top + margin) top = bounds.top + margin;
					else top = dims.top - tipHeight - margin;
					else top = bounds.top + bounds.height - tipHeight - margin;
					let left = dims.left + margin;
					if (dims.left < bounds.left) left = bounds.left + margin;
					if (dims.left + tipWidth > bounds.left + bounds.width) left = bounds.left + bounds.width - tipWidth - margin;
					top += "px";
					left += "px";
					return { style: {
						top,
						left
					} };
				}
				function boxWrap(dims, what, node) {
					Overlay_assign(node.style, {
						borderTopWidth: dims[what + "Top"] + "px",
						borderLeftWidth: dims[what + "Left"] + "px",
						borderRightWidth: dims[what + "Right"] + "px",
						borderBottomWidth: dims[what + "Bottom"] + "px",
						borderStyle: "solid"
					});
				}
				const overlayStyles = {
					background: "rgba(120, 170, 210, 0.7)",
					padding: "rgba(77, 200, 0, 0.3)",
					margin: "rgba(255, 155, 0, 0.3)",
					border: "rgba(255, 200, 50, 0.3)"
				};
				const SHOW_DURATION = 2e3;
				let timeoutID = null;
				let overlay = null;
				function hideOverlayNative(agent) {
					agent.emit("hideNativeHighlight");
				}
				function hideOverlayWeb() {
					timeoutID = null;
					if (overlay !== null) {
						overlay.remove();
						overlay = null;
					}
				}
				function hideOverlay(agent) {
					return isReactNativeEnvironment() ? hideOverlayNative(agent) : hideOverlayWeb();
				}
				function showOverlayNative(elements, agent) {
					agent.emit("showNativeHighlight", elements);
				}
				function showOverlayWeb(elements, componentName, agent, hideAfterTimeout) {
					if (timeoutID !== null) clearTimeout(timeoutID);
					if (overlay === null) overlay = new Overlay(agent);
					overlay.inspect(elements, componentName);
					if (hideAfterTimeout) timeoutID = setTimeout(() => hideOverlay(agent), SHOW_DURATION);
				}
				function showOverlay(elements, componentName, agent, hideAfterTimeout) {
					return isReactNativeEnvironment() ? showOverlayNative(elements, agent) : showOverlayWeb(elements, componentName, agent, hideAfterTimeout);
				}
				let iframesListeningTo = /* @__PURE__ */ new Set();
				let inspectOnlySuspenseNodes = false;
				function setupHighlighter(bridge, agent) {
					bridge.addListener("clearHostInstanceHighlight", clearHostInstanceHighlight);
					bridge.addListener("highlightHostInstance", highlightHostInstance);
					bridge.addListener("highlightHostInstances", highlightHostInstances);
					bridge.addListener("scrollToHostInstance", scrollToHostInstance);
					bridge.addListener("shutdown", stopInspectingHost);
					bridge.addListener("startInspectingHost", startInspectingHost);
					bridge.addListener("stopInspectingHost", stopInspectingHost);
					function startInspectingHost(onlySuspenseNodes) {
						inspectOnlySuspenseNodes = onlySuspenseNodes;
						registerListenersOnWindow(window);
					}
					function registerListenersOnWindow(window) {
						if (window && typeof window.addEventListener === "function") {
							window.addEventListener("click", onClick, true);
							window.addEventListener("mousedown", onMouseEvent, true);
							window.addEventListener("mouseover", onMouseEvent, true);
							window.addEventListener("mouseup", onMouseEvent, true);
							window.addEventListener("pointerdown", onPointerDown, true);
							window.addEventListener("pointermove", onPointerMove, true);
							window.addEventListener("pointerup", onPointerUp, true);
						} else agent.emit("startInspectingNative");
					}
					function stopInspectingHost() {
						hideOverlay(agent);
						removeListenersOnWindow(window);
						iframesListeningTo.forEach(function(frame) {
							try {
								removeListenersOnWindow(frame.contentWindow);
							} catch (error) {}
						});
						iframesListeningTo = /* @__PURE__ */ new Set();
					}
					function removeListenersOnWindow(window) {
						if (window && typeof window.removeEventListener === "function") {
							window.removeEventListener("click", onClick, true);
							window.removeEventListener("mousedown", onMouseEvent, true);
							window.removeEventListener("mouseover", onMouseEvent, true);
							window.removeEventListener("mouseup", onMouseEvent, true);
							window.removeEventListener("pointerdown", onPointerDown, true);
							window.removeEventListener("pointermove", onPointerMove, true);
							window.removeEventListener("pointerup", onPointerUp, true);
						} else agent.emit("stopInspectingNative");
					}
					function clearHostInstanceHighlight() {
						hideOverlay(agent);
					}
					function highlightHostInstance({ displayName, hideAfterTimeout, id, openBuiltinElementsPanel, rendererID, scrollIntoView }) {
						const renderer = agent.rendererInterfaces[rendererID];
						if (renderer == null) {
							console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
							hideOverlay(agent);
							return;
						}
						if (!renderer.hasElementWithId(id)) {
							hideOverlay(agent);
							return;
						}
						const nodes = renderer.findHostInstancesForElementID(id);
						if (nodes != null) for (let i = 0; i < nodes.length; i++) {
							const node = nodes[i];
							if (node === null) continue;
							const nodeRects = typeof node.getClientRects === "function" ? node.getClientRects() : [];
							if (nodeRects.length > 0 && (nodeRects.length > 2 || nodeRects[0].width > 0 || nodeRects[0].height > 0)) {
								if (scrollIntoView && typeof node.scrollIntoView === "function") {
									if (scrollDelayTimer) {
										clearTimeout(scrollDelayTimer);
										scrollDelayTimer = null;
									}
									node.scrollIntoView({
										block: "nearest",
										inline: "nearest"
									});
								}
								showOverlay(nodes, displayName, agent, hideAfterTimeout);
								if (openBuiltinElementsPanel) {
									window.__REACT_DEVTOOLS_GLOBAL_HOOK__.$0 = node;
									bridge.send("syncSelectionToBuiltinElementsPanel");
								}
								return;
							}
						}
						hideOverlay(agent);
					}
					function highlightHostInstances({ displayName, hideAfterTimeout, elements, scrollIntoView }) {
						const nodes = [];
						for (let i = 0; i < elements.length; i++) {
							const { id, rendererID } = elements[i];
							const renderer = agent.rendererInterfaces[rendererID];
							if (renderer == null) {
								console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
								continue;
							}
							if (!renderer.hasElementWithId(id)) continue;
							const hostInstances = renderer.findHostInstancesForElementID(id);
							if (hostInstances !== null) for (let j = 0; j < hostInstances.length; j++) nodes.push(hostInstances[j]);
						}
						if (nodes.length > 0) {
							const node = nodes[0];
							if (scrollIntoView && typeof node.scrollIntoView === "function") node.scrollIntoView({
								block: "nearest",
								inline: "nearest"
							});
						}
						showOverlay(nodes, displayName, agent, hideAfterTimeout);
					}
					function attemptScrollToHostInstance(renderer, id) {
						const nodes = renderer.findHostInstancesForElementID(id);
						if (nodes != null) for (let i = 0; i < nodes.length; i++) {
							const node = nodes[i];
							if (node === null) continue;
							const nodeRects = typeof node.getClientRects === "function" ? node.getClientRects() : [];
							if (nodeRects.length > 0 && (nodeRects.length > 2 || nodeRects[0].width > 0 || nodeRects[0].height > 0)) {
								if (typeof node.scrollIntoView === "function") {
									node.scrollIntoView({
										block: "nearest",
										inline: "nearest",
										behavior: "smooth"
									});
									return true;
								}
							}
						}
						return false;
					}
					let scrollDelayTimer = null;
					function scrollToHostInstance({ id, rendererID }) {
						hideOverlay(agent);
						if (scrollDelayTimer) {
							clearTimeout(scrollDelayTimer);
							scrollDelayTimer = null;
						}
						const renderer = agent.rendererInterfaces[rendererID];
						if (renderer == null) {
							console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
							return;
						}
						if (!renderer.hasElementWithId(id)) return;
						if (attemptScrollToHostInstance(renderer, id)) return;
						const rects = renderer.findLastKnownRectsForID(id);
						if (rects !== null && rects.length > 0) {
							let x = Infinity;
							let y = Infinity;
							for (let i = 0; i < rects.length; i++) {
								const rect = rects[i];
								if (rect.x < x) x = rect.x;
								if (rect.y < y) y = rect.y;
							}
							const element = document.documentElement;
							if (!element) return;
							if (x < window.scrollX || y < window.scrollY || x > window.scrollX + element.clientWidth || y > window.scrollY + element.clientHeight) window.scrollTo({
								top: y,
								left: x,
								behavior: "smooth"
							});
							scrollDelayTimer = setTimeout(() => {
								attemptScrollToHostInstance(renderer, id);
							}, 100);
						}
					}
					function onClick(event) {
						event.preventDefault();
						event.stopPropagation();
						stopInspectingHost();
						bridge.send("stopInspectingHost", true);
					}
					function onMouseEvent(event) {
						event.preventDefault();
						event.stopPropagation();
					}
					function onPointerDown(event) {
						event.preventDefault();
						event.stopPropagation();
						selectElementForNode(getEventTarget(event));
					}
					let lastHoveredNode = null;
					function onPointerMove(event) {
						event.preventDefault();
						event.stopPropagation();
						const target = getEventTarget(event);
						if (lastHoveredNode === target) return;
						lastHoveredNode = target;
						if (target.tagName === "IFRAME") {
							const iframe = target;
							try {
								if (!iframesListeningTo.has(iframe)) {
									const window = iframe.contentWindow;
									registerListenersOnWindow(window);
									iframesListeningTo.add(iframe);
								}
							} catch (error) {}
						}
						if (inspectOnlySuspenseNodes) {
							const match = agent.getIDForHostInstance(target, inspectOnlySuspenseNodes);
							if (match !== null) {
								const renderer = agent.rendererInterfaces[match.rendererID];
								if (renderer == null) {
									console.warn(`Invalid renderer id "${match.rendererID}" for element "${match.id}"`);
									return;
								}
								highlightHostInstance({
									displayName: renderer.getDisplayNameForElementID(match.id),
									hideAfterTimeout: false,
									id: match.id,
									openBuiltinElementsPanel: false,
									rendererID: match.rendererID,
									scrollIntoView: false
								});
							}
						} else showOverlay([target], null, agent, false);
					}
					function onPointerUp(event) {
						event.preventDefault();
						event.stopPropagation();
					}
					const selectElementForNode = (node) => {
						const match = agent.getIDForHostInstance(node, inspectOnlySuspenseNodes);
						if (match !== null) bridge.send("selectElement", match.id);
					};
					function getEventTarget(event) {
						if (event.composed) return event.composedPath()[0];
						return event.target;
					}
				}
				const COLORS = [
					"#37afa9",
					"#63b19e",
					"#80b393",
					"#97b488",
					"#abb67d",
					"#beb771",
					"#cfb965",
					"#dfba57",
					"#efbb49",
					"#febc38"
				];
				let canvas = null;
				function drawNative(nodeToData, agent) {
					const nodesToDraw = [];
					iterateNodes(nodeToData, ({ color, node }) => {
						nodesToDraw.push({
							node,
							color
						});
					});
					agent.emit("drawTraceUpdates", nodesToDraw);
					const mergedNodes = groupAndSortNodes(nodeToData);
					agent.emit("drawGroupedTraceUpdatesWithNames", mergedNodes);
				}
				function drawWeb(nodeToData) {
					if (canvas === null) initialize();
					const dpr = window.devicePixelRatio || 1;
					const canvasFlow = canvas;
					canvasFlow.width = window.innerWidth * dpr;
					canvasFlow.height = window.innerHeight * dpr;
					canvasFlow.style.width = `${window.innerWidth}px`;
					canvasFlow.style.height = `${window.innerHeight}px`;
					const context = canvasFlow.getContext("2d");
					context.scale(dpr, dpr);
					context.clearRect(0, 0, canvasFlow.width / dpr, canvasFlow.height / dpr);
					groupAndSortNodes(nodeToData).forEach((group) => {
						drawGroupBorders(context, group);
						drawGroupLabel(context, group);
					});
					if (canvas !== null) {
						if (nodeToData.size === 0 && canvas.matches(":popover-open")) {
							canvas.hidePopover();
							return;
						}
						if (canvas.matches(":popover-open")) canvas.hidePopover();
						canvas.showPopover();
					}
				}
				function groupAndSortNodes(nodeToData) {
					const positionGroups = /* @__PURE__ */ new Map();
					iterateNodes(nodeToData, ({ rect, color, displayName, count }) => {
						if (!rect) return;
						const key = `${rect.left},${rect.top}`;
						if (!positionGroups.has(key)) positionGroups.set(key, []);
						positionGroups.get(key)?.push({
							rect,
							color,
							displayName,
							count
						});
					});
					return Array.from(positionGroups.values()).sort((groupA, groupB) => {
						return Math.max(...groupA.map((item) => item.count)) - Math.max(...groupB.map((item) => item.count));
					});
				}
				function drawGroupBorders(context, group) {
					group.forEach(({ color, rect }) => {
						context.beginPath();
						context.strokeStyle = color;
						context.rect(rect.left, rect.top, rect.width - 1, rect.height - 1);
						context.stroke();
					});
				}
				function drawGroupLabel(context, group) {
					const mergedName = group.map(({ displayName, count }) => displayName ? `${displayName}${count > 1 ? ` x${count}` : ""}` : "").filter(Boolean).join(", ");
					if (mergedName) drawLabel(context, group[0].rect, mergedName, group[0].color);
				}
				function draw(nodeToData, agent) {
					return isReactNativeEnvironment() ? drawNative(nodeToData, agent) : drawWeb(nodeToData);
				}
				function iterateNodes(nodeToData, execute) {
					nodeToData.forEach((data, node) => {
						const color = COLORS[Math.min(COLORS.length - 1, data.count - 1)];
						execute({
							color,
							node,
							count: data.count,
							displayName: data.displayName,
							expirationTime: data.expirationTime,
							lastMeasuredAt: data.lastMeasuredAt,
							rect: data.rect
						});
					});
				}
				function drawLabel(context, rect, text, color) {
					const { left, top } = rect;
					context.font = "10px monospace";
					context.textBaseline = "middle";
					context.textAlign = "center";
					const padding = 2;
					const textHeight = 14;
					const backgroundWidth = context.measureText(text).width + padding * 2;
					const backgroundHeight = textHeight;
					const labelX = left;
					const labelY = top - backgroundHeight;
					context.fillStyle = color;
					context.fillRect(labelX, labelY, backgroundWidth, backgroundHeight);
					context.fillStyle = "#000000";
					context.fillText(text, labelX + backgroundWidth / 2, labelY + backgroundHeight / 2);
				}
				function destroyNative(agent) {
					agent.emit("disableTraceUpdates");
				}
				function destroyWeb() {
					if (canvas !== null) {
						if (canvas.matches(":popover-open")) canvas.hidePopover();
						if (canvas.parentNode != null) canvas.parentNode.removeChild(canvas);
						canvas = null;
					}
				}
				function destroy(agent) {
					return isReactNativeEnvironment() ? destroyNative(agent) : destroyWeb();
				}
				function initialize() {
					canvas = window.document.createElement("canvas");
					canvas.setAttribute("popover", "manual");
					canvas.style.cssText = `
    xx-background-color: red;
    xx-opacity: 0.5;
    bottom: 0;
    left: 0;
    pointer-events: none;
    position: fixed;
    right: 0;
    top: 0;
    background-color: transparent;
    outline: none;
    box-shadow: none;
    border: none;
  `;
					const root = window.document.documentElement;
					root.insertBefore(canvas, root.firstChild);
				}
				const DISPLAY_DURATION = 250;
				const MAX_DISPLAY_DURATION = 3e3;
				const REMEASUREMENT_AFTER_DURATION = 250;
				const HOC_MARKERS = new Map([["Forget", "✨"], ["Memo", "🧠"]]);
				const getCurrentTime = typeof performance === "object" && typeof performance.now === "function" ? () => performance.now() : () => Date.now();
				const nodeToData = /* @__PURE__ */ new Map();
				let agent = null;
				let drawAnimationFrameID = null;
				let isEnabled = false;
				let redrawTimeoutID = null;
				function TraceUpdates_initialize(injectedAgent) {
					agent = injectedAgent;
					agent.addListener("traceUpdates", traceUpdates);
				}
				function toggleEnabled(value) {
					isEnabled = value;
					if (!isEnabled) {
						nodeToData.clear();
						if (drawAnimationFrameID !== null) {
							cancelAnimationFrame(drawAnimationFrameID);
							drawAnimationFrameID = null;
						}
						if (redrawTimeoutID !== null) {
							clearTimeout(redrawTimeoutID);
							redrawTimeoutID = null;
						}
						destroy(agent);
					}
				}
				function traceUpdates(nodes) {
					if (!isEnabled) return;
					nodes.forEach((node) => {
						const data = nodeToData.get(node);
						const now = getCurrentTime();
						let lastMeasuredAt = data != null ? data.lastMeasuredAt : 0;
						let rect = data != null ? data.rect : null;
						if (rect === null || lastMeasuredAt + REMEASUREMENT_AFTER_DURATION < now) {
							lastMeasuredAt = now;
							rect = measureNode(node);
						}
						let displayName = agent.getComponentNameForHostInstance(node);
						if (displayName) {
							const { baseComponentName, hocNames } = extractHOCNames(displayName);
							const markers = hocNames.map((hoc) => HOC_MARKERS.get(hoc) || "").join("");
							displayName = markers ? `${markers}${baseComponentName}` : baseComponentName;
						}
						nodeToData.set(node, {
							count: data != null ? data.count + 1 : 1,
							expirationTime: data != null ? Math.min(now + MAX_DISPLAY_DURATION, data.expirationTime + DISPLAY_DURATION) : now + DISPLAY_DURATION,
							lastMeasuredAt,
							rect,
							displayName
						});
					});
					if (redrawTimeoutID !== null) {
						clearTimeout(redrawTimeoutID);
						redrawTimeoutID = null;
					}
					if (drawAnimationFrameID === null) drawAnimationFrameID = requestAnimationFrame(prepareToDraw);
				}
				function prepareToDraw() {
					drawAnimationFrameID = null;
					redrawTimeoutID = null;
					const now = getCurrentTime();
					let earliestExpiration = Number.MAX_VALUE;
					nodeToData.forEach((data, node) => {
						if (data.expirationTime < now) nodeToData.delete(node);
						else earliestExpiration = Math.min(earliestExpiration, data.expirationTime);
					});
					draw(nodeToData, agent);
					if (earliestExpiration !== Number.MAX_VALUE) redrawTimeoutID = setTimeout(prepareToDraw, earliestExpiration - now);
				}
				function measureNode(node) {
					if (!node || typeof node.getBoundingClientRect !== "function") return null;
					return getNestedBoundingClientRect(node, window.__REACT_DEVTOOLS_TARGET_WINDOW__ || window);
				}
				function bridge_defineProperty(obj, key, value) {
					key = bridge_toPropertyKey(key);
					if (key in obj) Object.defineProperty(obj, key, {
						value,
						enumerable: true,
						configurable: true,
						writable: true
					});
					else obj[key] = value;
					return obj;
				}
				function bridge_toPropertyKey(t) {
					var i = bridge_toPrimitive(t, "string");
					return "symbol" == typeof i ? i : i + "";
				}
				function bridge_toPrimitive(t, r) {
					if ("object" != typeof t || !t) return t;
					var e = t[Symbol.toPrimitive];
					if (void 0 !== e) {
						var i = e.call(t, r || "default");
						if ("object" != typeof i) return i;
						throw new TypeError("@@toPrimitive must return a primitive value.");
					}
					return ("string" === r ? String : Number)(t);
				}
				const BRIDGE_PROTOCOL = [
					{
						version: 0,
						minNpmVersion: "\"<4.11.0\"",
						maxNpmVersion: "\"<4.11.0\""
					},
					{
						version: 1,
						minNpmVersion: "4.13.0",
						maxNpmVersion: "4.21.0"
					},
					{
						version: 2,
						minNpmVersion: "4.22.0",
						maxNpmVersion: null
					}
				];
				const currentBridgeProtocol = BRIDGE_PROTOCOL[BRIDGE_PROTOCOL.length - 1];
				class Bridge extends EventEmitter {
					constructor(wall) {
						super();
						bridge_defineProperty(this, "_isShutdown", false);
						bridge_defineProperty(this, "_messageQueue", []);
						bridge_defineProperty(this, "_scheduledFlush", false);
						bridge_defineProperty(this, "_wallUnlisten", null);
						bridge_defineProperty(this, "_flush", () => {
							try {
								if (this._messageQueue.length) {
									for (let i = 0; i < this._messageQueue.length; i += 2) this._wall.send(this._messageQueue[i], ...this._messageQueue[i + 1]);
									this._messageQueue.length = 0;
								}
							} finally {
								this._scheduledFlush = false;
							}
						});
						bridge_defineProperty(this, "overrideValueAtPath", ({ id, path, rendererID, type, value }) => {
							switch (type) {
								case "context":
									this.send("overrideContext", {
										id,
										path,
										rendererID,
										wasForwarded: true,
										value
									});
									break;
								case "hooks":
									this.send("overrideHookState", {
										id,
										path,
										rendererID,
										wasForwarded: true,
										value
									});
									break;
								case "props":
									this.send("overrideProps", {
										id,
										path,
										rendererID,
										wasForwarded: true,
										value
									});
									break;
								case "state":
									this.send("overrideState", {
										id,
										path,
										rendererID,
										wasForwarded: true,
										value
									});
									break;
							}
						});
						this._wall = wall;
						this._wallUnlisten = wall.listen((message) => {
							if (message && message.event) this.emit(message.event, message.payload);
						}) || null;
						this.addListener("overrideValueAtPath", this.overrideValueAtPath);
					}
					get wall() {
						return this._wall;
					}
					send(event, ...payload) {
						if (this._isShutdown) {
							console.warn(`Cannot send message "${event}" through a Bridge that has been shutdown.`);
							return;
						}
						this._messageQueue.push(event, payload);
						if (!this._scheduledFlush) {
							this._scheduledFlush = true;
							if (typeof devtoolsJestTestScheduler === "function") devtoolsJestTestScheduler(this._flush);
							else queueMicrotask(this._flush);
						}
					}
					shutdown() {
						if (this._isShutdown) {
							console.warn("Bridge was already shutdown.");
							return;
						}
						this.emit("shutdown");
						this.send("shutdown");
						this._isShutdown = true;
						this.addListener = function() {};
						this.emit = function() {};
						this.removeAllListeners();
						const wallUnlisten = this._wallUnlisten;
						if (wallUnlisten) wallUnlisten();
						do
							this._flush();
						while (this._messageQueue.length);
					}
				}
				const bridge = Bridge;
				function agent_defineProperty(obj, key, value) {
					key = agent_toPropertyKey(key);
					if (key in obj) Object.defineProperty(obj, key, {
						value,
						enumerable: true,
						configurable: true,
						writable: true
					});
					else obj[key] = value;
					return obj;
				}
				function agent_toPropertyKey(t) {
					var i = agent_toPrimitive(t, "string");
					return "symbol" == typeof i ? i : i + "";
				}
				function agent_toPrimitive(t, r) {
					if ("object" != typeof t || !t) return t;
					var e = t[Symbol.toPrimitive];
					if (void 0 !== e) {
						var i = e.call(t, r || "default");
						if ("object" != typeof i) return i;
						throw new TypeError("@@toPrimitive must return a primitive value.");
					}
					return ("string" === r ? String : Number)(t);
				}
				function createEmptyInspectedScreen(arbitraryRootID, type) {
					return {
						id: arbitraryRootID,
						type,
						isErrored: false,
						errors: [],
						warnings: [],
						suspendedBy: {
							cleaned: [],
							data: [],
							unserializable: []
						},
						suspendedByRange: null,
						unknownSuspenders: UNKNOWN_SUSPENDERS_NONE,
						rootType: null,
						plugins: { stylex: null },
						nativeTag: null,
						env: null,
						source: null,
						stack: null,
						rendererPackageName: null,
						rendererVersion: null,
						key: null,
						canEditFunctionProps: false,
						canEditHooks: false,
						canEditFunctionPropsDeletePaths: false,
						canEditFunctionPropsRenamePaths: false,
						canEditHooksAndDeletePaths: false,
						canEditHooksAndRenamePaths: false,
						canToggleError: false,
						canToggleSuspense: false,
						isSuspended: false,
						hasLegacyContext: false,
						context: null,
						hooks: null,
						props: null,
						state: null,
						owners: null
					};
				}
				function mergeRoots(left, right, suspendedByOffset) {
					const leftSuspendedByRange = left.suspendedByRange;
					const rightSuspendedByRange = right.suspendedByRange;
					if (right.isErrored) left.isErrored = true;
					for (let i = 0; i < right.errors.length; i++) left.errors.push(right.errors[i]);
					for (let i = 0; i < right.warnings.length; i++) left.warnings.push(right.warnings[i]);
					const leftSuspendedBy = left.suspendedBy;
					const { data, cleaned, unserializable } = right.suspendedBy;
					const leftSuspendedByData = leftSuspendedBy.data;
					const rightSuspendedByData = data;
					for (let i = 0; i < rightSuspendedByData.length; i++) leftSuspendedByData.push(rightSuspendedByData[i]);
					for (let i = 0; i < cleaned.length; i++) leftSuspendedBy.cleaned.push([suspendedByOffset + cleaned[i][0]].concat(cleaned[i].slice(1)));
					for (let i = 0; i < unserializable.length; i++) leftSuspendedBy.unserializable.push([suspendedByOffset + unserializable[i][0]].concat(unserializable[i].slice(1)));
					if (rightSuspendedByRange !== null) if (leftSuspendedByRange === null) left.suspendedByRange = [rightSuspendedByRange[0], rightSuspendedByRange[1]];
					else {
						if (rightSuspendedByRange[0] < leftSuspendedByRange[0]) leftSuspendedByRange[0] = rightSuspendedByRange[0];
						if (rightSuspendedByRange[1] > leftSuspendedByRange[1]) leftSuspendedByRange[1] = rightSuspendedByRange[1];
					}
				}
				class Agent extends EventEmitter {
					constructor(bridge, isProfiling = false, onReloadAndProfile) {
						super();
						agent_defineProperty(this, "_isProfiling", false);
						agent_defineProperty(this, "_rendererInterfaces", {});
						agent_defineProperty(this, "_persistedSelection", null);
						agent_defineProperty(this, "_persistedSelectionMatch", null);
						agent_defineProperty(this, "_traceUpdatesEnabled", false);
						agent_defineProperty(this, "clearErrorsAndWarnings", ({ rendererID }) => {
							const renderer = this._rendererInterfaces[rendererID];
							if (renderer == null) console.warn(`Invalid renderer id "${rendererID}"`);
							else renderer.clearErrorsAndWarnings();
						});
						agent_defineProperty(this, "clearErrorsForElementID", ({ id, rendererID }) => {
							const renderer = this._rendererInterfaces[rendererID];
							if (renderer == null) console.warn(`Invalid renderer id "${rendererID}"`);
							else renderer.clearErrorsForElementID(id);
						});
						agent_defineProperty(this, "clearWarningsForElementID", ({ id, rendererID }) => {
							const renderer = this._rendererInterfaces[rendererID];
							if (renderer == null) console.warn(`Invalid renderer id "${rendererID}"`);
							else renderer.clearWarningsForElementID(id);
						});
						agent_defineProperty(this, "copyElementPath", ({ id, path, rendererID }) => {
							const renderer = this._rendererInterfaces[rendererID];
							if (renderer == null) console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
							else {
								const value = renderer.getSerializedElementValueByPath(id, path);
								if (value != null) this._bridge.send("saveToClipboard", value);
								else console.warn(`Unable to obtain serialized value for element "${id}"`);
							}
						});
						agent_defineProperty(this, "deletePath", ({ hookID, id, path, rendererID, type }) => {
							const renderer = this._rendererInterfaces[rendererID];
							if (renderer == null) console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
							else renderer.deletePath(type, id, hookID, path);
						});
						agent_defineProperty(this, "getBackendVersion", () => {
							this._bridge.send("backendVersion", "7.0.1-3cde211b0c");
						});
						agent_defineProperty(this, "getBridgeProtocol", () => {
							this._bridge.send("bridgeProtocol", currentBridgeProtocol);
						});
						agent_defineProperty(this, "getProfilingData", ({ rendererID }) => {
							const renderer = this._rendererInterfaces[rendererID];
							if (renderer == null) console.warn(`Invalid renderer id "${rendererID}"`);
							this._bridge.send("profilingData", renderer.getProfilingData());
						});
						agent_defineProperty(this, "getProfilingStatus", () => {
							this._bridge.send("profilingStatus", this._isProfiling);
						});
						agent_defineProperty(this, "getOwnersList", ({ id, rendererID }) => {
							const renderer = this._rendererInterfaces[rendererID];
							if (renderer == null) console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
							else {
								const owners = renderer.getOwnersList(id);
								this._bridge.send("ownersList", {
									id,
									owners
								});
							}
						});
						agent_defineProperty(this, "inspectElement", ({ forceFullData, id, path, rendererID, requestID }) => {
							const renderer = this._rendererInterfaces[rendererID];
							if (renderer == null) console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
							else {
								this._bridge.send("inspectedElement", renderer.inspectElement(requestID, id, path, forceFullData));
								if (this._persistedSelectionMatch === null || this._persistedSelectionMatch.id !== id) {
									this._persistedSelection = null;
									this._persistedSelectionMatch = null;
									renderer.setTrackedPath(null);
									this._lastSelectedElementID = id;
									this._lastSelectedRendererID = rendererID;
									if (!this._persistSelectionTimerScheduled) {
										this._persistSelectionTimerScheduled = true;
										setTimeout(this._persistSelection, 1e3);
									}
								}
							}
						});
						agent_defineProperty(this, "inspectScreen", ({ requestID, id, forceFullData, path: screenPath }) => {
							let inspectedScreen = null;
							let found = false;
							let suspendedByOffset = 0;
							let suspendedByPathIndex = null;
							let rendererPath = null;
							if (screenPath !== null && screenPath.length > 1) {
								if (screenPath[0] !== "suspendedBy") throw new Error("Only hydrating suspendedBy paths is supported. This is a bug.");
								if (typeof screenPath[1] !== "number") throw new Error(`Expected suspendedBy index to be a number. Received '${screenPath[1]}' instead. This is a bug.`);
								suspendedByPathIndex = screenPath[1];
								rendererPath = screenPath.slice(2);
							}
							for (const rendererID in this._rendererInterfaces) {
								const renderer = this._rendererInterfaces[rendererID];
								let path = null;
								if (suspendedByPathIndex !== null && rendererPath !== null) {
									const suspendedByPathRendererIndex = suspendedByPathIndex - suspendedByOffset;
									if (renderer.getElementAttributeByPath(id, ["suspendedBy", suspendedByPathRendererIndex]) !== void 0) path = ["suspendedBy", suspendedByPathRendererIndex].concat(rendererPath);
								}
								const inspectedRootsPayload = renderer.inspectElement(requestID, id, path, forceFullData);
								switch (inspectedRootsPayload.type) {
									case "hydrated-path":
										inspectedRootsPayload.path[1] += suspendedByOffset;
										if (inspectedRootsPayload.value !== null) for (let i = 0; i < inspectedRootsPayload.value.cleaned.length; i++) inspectedRootsPayload.value.cleaned[i][1] += suspendedByOffset;
										this._bridge.send("inspectedScreen", inspectedRootsPayload);
										return;
									case "full-data":
										const inspectedRoots = inspectedRootsPayload.value;
										if (inspectedScreen === null) inspectedScreen = createEmptyInspectedScreen(inspectedRoots.id, inspectedRoots.type);
										mergeRoots(inspectedScreen, inspectedRoots, suspendedByOffset);
										const suspendedBy = inspectedRoots.suspendedBy.data;
										suspendedByOffset += suspendedBy.length;
										found = true;
										break;
									case "no-change":
										found = true;
										const rootsSuspendedBy = renderer.getElementAttributeByPath(id, ["suspendedBy"]);
										suspendedByOffset += rootsSuspendedBy.length;
										break;
									case "not-found": break;
									case "error":
										this._bridge.send("inspectedScreen", inspectedRootsPayload);
										return;
								}
							}
							if (inspectedScreen === null) if (found) this._bridge.send("inspectedScreen", {
								type: "no-change",
								responseID: requestID,
								id
							});
							else this._bridge.send("inspectedScreen", {
								type: "not-found",
								responseID: requestID,
								id
							});
							else this._bridge.send("inspectedScreen", {
								type: "full-data",
								responseID: requestID,
								id,
								value: inspectedScreen
							});
						});
						agent_defineProperty(this, "logElementToConsole", ({ id, rendererID }) => {
							const renderer = this._rendererInterfaces[rendererID];
							if (renderer == null) console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
							else renderer.logElementToConsole(id);
						});
						agent_defineProperty(this, "overrideError", ({ id, rendererID, forceError }) => {
							const renderer = this._rendererInterfaces[rendererID];
							if (renderer == null) console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
							else renderer.overrideError(id, forceError);
						});
						agent_defineProperty(this, "overrideSuspense", ({ id, rendererID, forceFallback }) => {
							const renderer = this._rendererInterfaces[rendererID];
							if (renderer == null) console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
							else renderer.overrideSuspense(id, forceFallback);
						});
						agent_defineProperty(this, "overrideSuspenseMilestone", ({ suspendedSet }) => {
							for (const rendererID in this._rendererInterfaces) {
								const renderer = this._rendererInterfaces[rendererID];
								if (renderer.supportsTogglingSuspense) renderer.overrideSuspenseMilestone(suspendedSet);
							}
						});
						agent_defineProperty(this, "overrideValueAtPath", ({ hookID, id, path, rendererID, type, value }) => {
							const renderer = this._rendererInterfaces[rendererID];
							if (renderer == null) console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
							else renderer.overrideValueAtPath(type, id, hookID, path, value);
						});
						agent_defineProperty(this, "overrideContext", ({ id, path, rendererID, wasForwarded, value }) => {
							if (!wasForwarded) this.overrideValueAtPath({
								id,
								path,
								rendererID,
								type: "context",
								value
							});
						});
						agent_defineProperty(this, "overrideHookState", ({ id, hookID, path, rendererID, wasForwarded, value }) => {
							if (!wasForwarded) this.overrideValueAtPath({
								id,
								path,
								rendererID,
								type: "hooks",
								value
							});
						});
						agent_defineProperty(this, "overrideProps", ({ id, path, rendererID, wasForwarded, value }) => {
							if (!wasForwarded) this.overrideValueAtPath({
								id,
								path,
								rendererID,
								type: "props",
								value
							});
						});
						agent_defineProperty(this, "overrideState", ({ id, path, rendererID, wasForwarded, value }) => {
							if (!wasForwarded) this.overrideValueAtPath({
								id,
								path,
								rendererID,
								type: "state",
								value
							});
						});
						agent_defineProperty(this, "onReloadAndProfileSupportedByHost", () => {
							this._bridge.send("isReloadAndProfileSupportedByBackend", true);
						});
						agent_defineProperty(this, "reloadAndProfile", ({ recordChangeDescriptions, recordTimeline }) => {
							if (typeof this._onReloadAndProfile === "function") this._onReloadAndProfile(recordChangeDescriptions, recordTimeline);
							this._bridge.send("reloadAppForProfiling");
						});
						agent_defineProperty(this, "renamePath", ({ hookID, id, newPath, oldPath, rendererID, type }) => {
							const renderer = this._rendererInterfaces[rendererID];
							if (renderer == null) console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
							else renderer.renamePath(type, id, hookID, oldPath, newPath);
						});
						agent_defineProperty(this, "setTraceUpdatesEnabled", (traceUpdatesEnabled) => {
							this._traceUpdatesEnabled = traceUpdatesEnabled;
							toggleEnabled(traceUpdatesEnabled);
							for (const rendererID in this._rendererInterfaces) this._rendererInterfaces[rendererID].setTraceUpdatesEnabled(traceUpdatesEnabled);
						});
						agent_defineProperty(this, "syncSelectionFromBuiltinElementsPanel", () => {
							const target = window.__REACT_DEVTOOLS_GLOBAL_HOOK__.$0;
							if (target == null) return;
							this.selectNode(target);
						});
						agent_defineProperty(this, "shutdown", () => {
							this.emit("shutdown");
							this._bridge.removeAllListeners();
							this.removeAllListeners();
						});
						agent_defineProperty(this, "startProfiling", ({ recordChangeDescriptions, recordTimeline }) => {
							this._isProfiling = true;
							for (const rendererID in this._rendererInterfaces) this._rendererInterfaces[rendererID].startProfiling(recordChangeDescriptions, recordTimeline);
							this._bridge.send("profilingStatus", this._isProfiling);
						});
						agent_defineProperty(this, "stopProfiling", () => {
							this._isProfiling = false;
							for (const rendererID in this._rendererInterfaces) this._rendererInterfaces[rendererID].stopProfiling();
							this._bridge.send("profilingStatus", this._isProfiling);
						});
						agent_defineProperty(this, "stopInspectingNative", (selected) => {
							this._bridge.send("stopInspectingHost", selected);
						});
						agent_defineProperty(this, "storeAsGlobal", ({ count, id, path, rendererID }) => {
							const renderer = this._rendererInterfaces[rendererID];
							if (renderer == null) console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
							else renderer.storeAsGlobal(id, path, count);
						});
						agent_defineProperty(this, "updateHookSettings", (settings) => {
							this.emit("updateHookSettings", settings);
						});
						agent_defineProperty(this, "getHookSettings", () => {
							this.emit("getHookSettings");
						});
						agent_defineProperty(this, "onHookSettings", (settings) => {
							this._bridge.send("hookSettings", settings);
						});
						agent_defineProperty(this, "updateComponentFilters", (componentFilters) => {
							for (const rendererIDString in this._rendererInterfaces) {
								const rendererID = +rendererIDString;
								const renderer = this._rendererInterfaces[rendererID];
								if (this._lastSelectedRendererID === rendererID) {
									const path = renderer.getPathForElement(this._lastSelectedElementID);
									if (path !== null) {
										renderer.setTrackedPath(path);
										this._persistedSelection = {
											rendererID,
											path
										};
									}
								}
								renderer.updateComponentFilters(componentFilters);
							}
						});
						agent_defineProperty(this, "getEnvironmentNames", () => {
							let accumulatedNames = null;
							for (const rendererID in this._rendererInterfaces) {
								const names = this._rendererInterfaces[+rendererID].getEnvironmentNames();
								if (accumulatedNames === null) accumulatedNames = names;
								else for (let i = 0; i < names.length; i++) if (accumulatedNames.indexOf(names[i]) === -1) accumulatedNames.push(names[i]);
							}
							this._bridge.send("environmentNames", accumulatedNames || []);
						});
						agent_defineProperty(this, "onTraceUpdates", (nodes) => {
							this.emit("traceUpdates", nodes);
						});
						agent_defineProperty(this, "onFastRefreshScheduled", () => {
							this._bridge.send("fastRefreshScheduled");
						});
						agent_defineProperty(this, "onHookOperations", (operations) => {
							this._bridge.send("operations", operations);
							if (this._persistedSelection !== null) {
								const rendererID = operations[0];
								if (this._persistedSelection.rendererID === rendererID) {
									const renderer = this._rendererInterfaces[rendererID];
									if (renderer == null) console.warn(`Invalid renderer id "${rendererID}"`);
									else {
										const prevMatch = this._persistedSelectionMatch;
										const nextMatch = renderer.getBestMatchForTrackedPath();
										this._persistedSelectionMatch = nextMatch;
										const prevMatchID = prevMatch !== null ? prevMatch.id : null;
										const nextMatchID = nextMatch !== null ? nextMatch.id : null;
										if (prevMatchID !== nextMatchID) {
											if (nextMatchID !== null) this._bridge.send("selectElement", nextMatchID);
										}
										if (nextMatch !== null && nextMatch.isFullMatch) {
											this._persistedSelection = null;
											this._persistedSelectionMatch = null;
											renderer.setTrackedPath(null);
										}
									}
								}
							}
						});
						agent_defineProperty(this, "getIfHasUnsupportedRendererVersion", () => {
							this.emit("getIfHasUnsupportedRendererVersion");
						});
						agent_defineProperty(this, "_persistSelectionTimerScheduled", false);
						agent_defineProperty(this, "_lastSelectedRendererID", -1);
						agent_defineProperty(this, "_lastSelectedElementID", -1);
						agent_defineProperty(this, "_persistSelection", () => {
							this._persistSelectionTimerScheduled = false;
							const rendererID = this._lastSelectedRendererID;
							const id = this._lastSelectedElementID;
							const renderer = this._rendererInterfaces[rendererID];
							const path = renderer != null ? renderer.getPathForElement(id) : null;
							if (path !== null) sessionStorageSetItem(SESSION_STORAGE_LAST_SELECTION_KEY, JSON.stringify({
								rendererID,
								path
							}));
							else sessionStorageRemoveItem(SESSION_STORAGE_LAST_SELECTION_KEY);
						});
						this._isProfiling = isProfiling;
						this._onReloadAndProfile = onReloadAndProfile;
						const persistedSelectionString = storage_sessionStorageGetItem(SESSION_STORAGE_LAST_SELECTION_KEY);
						if (persistedSelectionString != null) this._persistedSelection = JSON.parse(persistedSelectionString);
						this._bridge = bridge;
						bridge.addListener("clearErrorsAndWarnings", this.clearErrorsAndWarnings);
						bridge.addListener("clearErrorsForElementID", this.clearErrorsForElementID);
						bridge.addListener("clearWarningsForElementID", this.clearWarningsForElementID);
						bridge.addListener("copyElementPath", this.copyElementPath);
						bridge.addListener("deletePath", this.deletePath);
						bridge.addListener("getBackendVersion", this.getBackendVersion);
						bridge.addListener("getBridgeProtocol", this.getBridgeProtocol);
						bridge.addListener("getProfilingData", this.getProfilingData);
						bridge.addListener("getProfilingStatus", this.getProfilingStatus);
						bridge.addListener("getOwnersList", this.getOwnersList);
						bridge.addListener("inspectElement", this.inspectElement);
						bridge.addListener("inspectScreen", this.inspectScreen);
						bridge.addListener("logElementToConsole", this.logElementToConsole);
						bridge.addListener("overrideError", this.overrideError);
						bridge.addListener("overrideSuspense", this.overrideSuspense);
						bridge.addListener("overrideSuspenseMilestone", this.overrideSuspenseMilestone);
						bridge.addListener("overrideValueAtPath", this.overrideValueAtPath);
						bridge.addListener("reloadAndProfile", this.reloadAndProfile);
						bridge.addListener("renamePath", this.renamePath);
						bridge.addListener("setTraceUpdatesEnabled", this.setTraceUpdatesEnabled);
						bridge.addListener("startProfiling", this.startProfiling);
						bridge.addListener("stopProfiling", this.stopProfiling);
						bridge.addListener("storeAsGlobal", this.storeAsGlobal);
						bridge.addListener("syncSelectionFromBuiltinElementsPanel", this.syncSelectionFromBuiltinElementsPanel);
						bridge.addListener("shutdown", this.shutdown);
						bridge.addListener("updateHookSettings", this.updateHookSettings);
						bridge.addListener("getHookSettings", this.getHookSettings);
						bridge.addListener("updateComponentFilters", this.updateComponentFilters);
						bridge.addListener("getEnvironmentNames", this.getEnvironmentNames);
						bridge.addListener("getIfHasUnsupportedRendererVersion", this.getIfHasUnsupportedRendererVersion);
						bridge.addListener("overrideContext", this.overrideContext);
						bridge.addListener("overrideHookState", this.overrideHookState);
						bridge.addListener("overrideProps", this.overrideProps);
						bridge.addListener("overrideState", this.overrideState);
						setupHighlighter(bridge, this);
						TraceUpdates_initialize(this);
						bridge.send("backendInitialized");
						if (this._isProfiling) bridge.send("profilingStatus", true);
					}
					get rendererInterfaces() {
						return this._rendererInterfaces;
					}
					getInstanceAndStyle({ id, rendererID }) {
						const renderer = this._rendererInterfaces[rendererID];
						if (renderer == null) {
							console.warn(`Invalid renderer id "${rendererID}"`);
							return null;
						}
						return renderer.getInstanceAndStyle(id);
					}
					getIDForHostInstance(target, onlySuspenseNodes) {
						if (isReactNativeEnvironment() || typeof target.nodeType !== "number") {
							for (const rendererID in this._rendererInterfaces) {
								const renderer = this._rendererInterfaces[rendererID];
								try {
									const id = onlySuspenseNodes ? renderer.getSuspenseNodeIDForHostInstance(target) : renderer.getElementIDForHostInstance(target);
									if (id !== null) return {
										id,
										rendererID: +rendererID
									};
								} catch (error) {}
							}
							return null;
						} else {
							let bestMatch = null;
							let bestRenderer = null;
							let bestRendererID = 0;
							for (const rendererID in this._rendererInterfaces) {
								const renderer = this._rendererInterfaces[rendererID];
								const nearestNode = renderer.getNearestMountedDOMNode(target);
								if (nearestNode !== null) {
									if (nearestNode === target) {
										bestMatch = nearestNode;
										bestRenderer = renderer;
										bestRendererID = +rendererID;
										break;
									}
									if (bestMatch === null || bestMatch.contains(nearestNode)) {
										bestMatch = nearestNode;
										bestRenderer = renderer;
										bestRendererID = +rendererID;
									}
								}
							}
							if (bestRenderer != null && bestMatch != null) try {
								const id = onlySuspenseNodes ? bestRenderer.getSuspenseNodeIDForHostInstance(bestMatch) : bestRenderer.getElementIDForHostInstance(bestMatch);
								if (id !== null) return {
									id,
									rendererID: bestRendererID
								};
							} catch (error) {}
							return null;
						}
					}
					getComponentNameForHostInstance(target) {
						const match = this.getIDForHostInstance(target);
						if (match !== null) return this._rendererInterfaces[match.rendererID].getDisplayNameForElementID(match.id);
						return null;
					}
					selectNode(target) {
						const match = this.getIDForHostInstance(target);
						if (match !== null) this._bridge.send("selectElement", match.id);
					}
					registerRendererInterface(rendererID, rendererInterface) {
						this._rendererInterfaces[rendererID] = rendererInterface;
						rendererInterface.setTraceUpdatesEnabled(this._traceUpdatesEnabled);
						const renderer = rendererInterface.renderer;
						if (renderer !== null) {
							if (renderer.bundleType === 1 && gte(renderer.version, "19.3.0-canary")) this._bridge.send("enableSuspenseTab");
						}
						const selection = this._persistedSelection;
						if (selection !== null && selection.rendererID === rendererID) rendererInterface.setTrackedPath(selection.path);
					}
					onUnsupportedRenderer() {
						this._bridge.send("unsupportedRendererVersion");
					}
				}
				function initBackend(hook, agent, global, isReloadAndProfileSupported) {
					if (hook == null) return () => {};
					function registerRendererInterface(id, rendererInterface) {
						agent.registerRendererInterface(id, rendererInterface);
						rendererInterface.flushInitialOperations();
					}
					const subs = [
						hook.sub("renderer-attached", ({ id, rendererInterface }) => {
							registerRendererInterface(id, rendererInterface);
						}),
						hook.sub("unsupported-renderer-version", () => {
							agent.onUnsupportedRenderer();
						}),
						hook.sub("fastRefreshScheduled", agent.onFastRefreshScheduled),
						hook.sub("operations", agent.onHookOperations),
						hook.sub("traceUpdates", agent.onTraceUpdates),
						hook.sub("settingsInitialized", agent.onHookSettings)
					];
					agent.addListener("getIfHasUnsupportedRendererVersion", () => {
						if (hook.hasUnsupportedRendererAttached) agent.onUnsupportedRenderer();
					});
					hook.rendererInterfaces.forEach((rendererInterface, id) => {
						registerRendererInterface(id, rendererInterface);
					});
					hook.emit("react-devtools", agent);
					hook.reactDevtoolsAgent = agent;
					const onAgentShutdown = () => {
						subs.forEach((fn) => fn());
						hook.rendererInterfaces.forEach((rendererInterface) => {
							rendererInterface.cleanup();
						});
						hook.reactDevtoolsAgent = null;
					};
					agent.addListener("shutdown", onAgentShutdown);
					agent.addListener("updateHookSettings", (settings) => {
						hook.settings = settings;
					});
					agent.addListener("getHookSettings", () => {
						if (hook.settings != null) agent.onHookSettings(hook.settings);
					});
					if (isReloadAndProfileSupported) agent.onReloadAndProfileSupportedByHost();
					return () => {
						subs.forEach((fn) => fn());
					};
				}
				let disabledDepth = 0;
				let prevLog;
				let prevInfo;
				let prevWarn;
				let prevError;
				let prevGroup;
				let prevGroupCollapsed;
				let prevGroupEnd;
				function disabledLog() {}
				disabledLog.__reactDisabledLog = true;
				function disableLogs() {
					if (disabledDepth === 0) {
						prevLog = console.log;
						prevInfo = console.info;
						prevWarn = console.warn;
						prevError = console.error;
						prevGroup = console.group;
						prevGroupCollapsed = console.groupCollapsed;
						prevGroupEnd = console.groupEnd;
						const props = {
							configurable: true,
							enumerable: true,
							value: disabledLog,
							writable: true
						};
						Object.defineProperties(console, {
							info: props,
							log: props,
							warn: props,
							error: props,
							group: props,
							groupCollapsed: props,
							groupEnd: props
						});
					}
					disabledDepth++;
				}
				function reenableLogs() {
					disabledDepth--;
					if (disabledDepth === 0) {
						const props = {
							configurable: true,
							enumerable: true,
							writable: true
						};
						Object.defineProperties(console, {
							log: {
								...props,
								value: prevLog
							},
							info: {
								...props,
								value: prevInfo
							},
							warn: {
								...props,
								value: prevWarn
							},
							error: {
								...props,
								value: prevError
							},
							group: {
								...props,
								value: prevGroup
							},
							groupCollapsed: {
								...props,
								value: prevGroupCollapsed
							},
							groupEnd: {
								...props,
								value: prevGroupEnd
							}
						});
					}
					if (disabledDepth < 0) console.error("disabledDepth fell below zero. This is a bug in React. Please file an issue.");
				}
				let prefix;
				function describeBuiltInComponentFrame(name) {
					if (prefix === void 0) try {
						throw Error();
					} catch (x) {
						const match = x.stack.trim().match(/\n( *(at )?)/);
						prefix = match && match[1] || "";
					}
					return "\n" + prefix + name;
				}
				function describeDebugInfoFrame(name, env) {
					return describeBuiltInComponentFrame(name + (env ? " [" + env + "]" : ""));
				}
				let reentry = false;
				function describeNativeComponentFrame(fn, construct, currentDispatcherRef) {
					if (!fn || reentry) return "";
					const previousPrepareStackTrace = Error.prepareStackTrace;
					Error.prepareStackTrace = void 0;
					reentry = true;
					const previousDispatcher = currentDispatcherRef.H;
					currentDispatcherRef.H = null;
					disableLogs();
					try {
						const RunInRootFrame = { DetermineComponentFrameRoot() {
							let control;
							try {
								if (construct) {
									const Fake = function() {
										throw Error();
									};
									Object.defineProperty(Fake.prototype, "props", { set: function() {
										throw Error();
									} });
									if (typeof Reflect === "object" && Reflect.construct) {
										try {
											Reflect.construct(Fake, []);
										} catch (x) {
											control = x;
										}
										Reflect.construct(fn, [], Fake);
									} else {
										try {
											Fake.call();
										} catch (x) {
											control = x;
										}
										fn.call(Fake.prototype);
									}
								} else {
									try {
										throw Error();
									} catch (x) {
										control = x;
									}
									const maybePromise = fn();
									if (maybePromise && typeof maybePromise.catch === "function") maybePromise.catch(() => {});
								}
							} catch (sample) {
								if (sample && control && typeof sample.stack === "string") return [sample.stack, control.stack];
							}
							return [null, null];
						} };
						RunInRootFrame.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
						const namePropDescriptor = Object.getOwnPropertyDescriptor(RunInRootFrame.DetermineComponentFrameRoot, "name");
						if (namePropDescriptor && namePropDescriptor.configurable) Object.defineProperty(RunInRootFrame.DetermineComponentFrameRoot, "name", { value: "DetermineComponentFrameRoot" });
						const [sampleStack, controlStack] = RunInRootFrame.DetermineComponentFrameRoot();
						if (sampleStack && controlStack) {
							const sampleLines = sampleStack.split("\n");
							const controlLines = controlStack.split("\n");
							let s = 0;
							let c = 0;
							while (s < sampleLines.length && !sampleLines[s].includes("DetermineComponentFrameRoot")) s++;
							while (c < controlLines.length && !controlLines[c].includes("DetermineComponentFrameRoot")) c++;
							if (s === sampleLines.length || c === controlLines.length) {
								s = sampleLines.length - 1;
								c = controlLines.length - 1;
								while (s >= 1 && c >= 0 && sampleLines[s] !== controlLines[c]) c--;
							}
							for (; s >= 1 && c >= 0; s--, c--) if (sampleLines[s] !== controlLines[c]) {
								if (s !== 1 || c !== 1) do {
									s--;
									c--;
									if (c < 0 || sampleLines[s] !== controlLines[c]) {
										let frame = "\n" + sampleLines[s].replace(" at new ", " at ");
										if (fn.displayName && frame.includes("<anonymous>")) frame = frame.replace("<anonymous>", fn.displayName);
										return frame;
									}
								} while (s >= 1 && c >= 0);
								break;
							}
						}
					} finally {
						reentry = false;
						Error.prepareStackTrace = previousPrepareStackTrace;
						currentDispatcherRef.H = previousDispatcher;
						reenableLogs();
					}
					const name = fn ? fn.displayName || fn.name : "";
					return name ? describeBuiltInComponentFrame(name) : "";
				}
				function describeClassComponentFrame(ctor, currentDispatcherRef) {
					return describeNativeComponentFrame(ctor, true, currentDispatcherRef);
				}
				function describeFunctionComponentFrame(fn, currentDispatcherRef) {
					return describeNativeComponentFrame(fn, false, currentDispatcherRef);
				}
				function formatOwnerStack(error) {
					const prevPrepareStackTrace = Error.prepareStackTrace;
					Error.prepareStackTrace = void 0;
					let stack = error.stack;
					Error.prepareStackTrace = prevPrepareStackTrace;
					if (stack.startsWith("Error: react-stack-top-frame\n")) stack = stack.slice(29);
					let idx = stack.indexOf("\n");
					if (idx !== -1) stack = stack.slice(idx + 1);
					idx = stack.indexOf("react_stack_bottom_frame");
					if (idx === -1) idx = stack.indexOf("react-stack-bottom-frame");
					if (idx !== -1) idx = stack.lastIndexOf("\n", idx);
					if (idx !== -1) stack = stack.slice(0, idx);
					else return "";
					return stack;
				}
				function getOwnerStackByComponentInfoInDev(componentInfo) {
					try {
						let info = "";
						if (!componentInfo.owner && typeof componentInfo.name === "string") return describeBuiltInComponentFrame(componentInfo.name);
						let owner = componentInfo;
						while (owner) {
							const ownerStack = owner.debugStack;
							if (ownerStack != null) {
								owner = owner.owner;
								if (owner) info += "\n" + formatOwnerStack(ownerStack);
							} else break;
						}
						return info;
					} catch (x) {
						return "\nError generating stack: " + x.message + "\n" + x.stack;
					}
				}
				const componentInfoToComponentLogsMap = /* @__PURE__ */ new WeakMap();
				function supportsConsoleTasks(componentInfo) {
					return !!componentInfo.debugTask;
				}
				function attach(hook, rendererID, renderer, global) {
					const { getCurrentComponentInfo } = renderer;
					function getComponentStack(topFrame) {
						if (getCurrentComponentInfo === void 0) return null;
						const current = getCurrentComponentInfo();
						if (current === null) return null;
						if (supportsConsoleTasks(current)) return null;
						const enableOwnerStacks = current.debugStack != null;
						let componentStack = "";
						if (enableOwnerStacks) {
							const topStackFrames = formatOwnerStack(topFrame);
							if (topStackFrames) componentStack += "\n" + topStackFrames;
							componentStack += getOwnerStackByComponentInfoInDev(current);
						}
						return {
							enableOwnerStacks,
							componentStack
						};
					}
					function onErrorOrWarning(type, args) {
						if (getCurrentComponentInfo === void 0) return;
						const componentInfo = getCurrentComponentInfo();
						if (componentInfo === null) return;
						if (args.length > 3 && typeof args[0] === "string" && args[0].startsWith("%c%s%c ") && typeof args[1] === "string" && typeof args[2] === "string" && typeof args[3] === "string") {
							const format = args[0].slice(7);
							const env = args[2].trim();
							args = args.slice(4);
							if (env !== componentInfo.env) args.unshift("[" + env + "] " + format);
							else args.unshift(format);
						}
						const message = formatConsoleArgumentsToSingleString(...args);
						let componentLogsEntry = componentInfoToComponentLogsMap.get(componentInfo);
						if (componentLogsEntry === void 0) {
							componentLogsEntry = {
								errors: /* @__PURE__ */ new Map(),
								errorsCount: 0,
								warnings: /* @__PURE__ */ new Map(),
								warningsCount: 0
							};
							componentInfoToComponentLogsMap.set(componentInfo, componentLogsEntry);
						}
						const messageMap = type === "error" ? componentLogsEntry.errors : componentLogsEntry.warnings;
						const count = messageMap.get(message) || 0;
						messageMap.set(message, count + 1);
						if (type === "error") componentLogsEntry.errorsCount++;
						else componentLogsEntry.warningsCount++;
					}
					return {
						cleanup() {},
						clearErrorsAndWarnings() {},
						clearErrorsForElementID() {},
						clearWarningsForElementID() {},
						getSerializedElementValueByPath() {},
						deletePath() {},
						findHostInstancesForElementID() {
							return null;
						},
						findLastKnownRectsForID() {
							return null;
						},
						flushInitialOperations() {},
						getBestMatchForTrackedPath() {
							return null;
						},
						getComponentStack,
						getDisplayNameForElementID() {
							return null;
						},
						getNearestMountedDOMNode() {
							return null;
						},
						getElementIDForHostInstance() {
							return null;
						},
						getSuspenseNodeIDForHostInstance() {
							return null;
						},
						getInstanceAndStyle() {
							return {
								instance: null,
								style: null
							};
						},
						getOwnersList() {
							return null;
						},
						getPathForElement() {
							return null;
						},
						getProfilingData() {
							throw new Error("getProfilingData not supported by this renderer");
						},
						handleCommitFiberRoot() {},
						handleCommitFiberUnmount() {},
						handlePostCommitFiberRoot() {},
						hasElementWithId() {
							return false;
						},
						inspectElement(requestID, id, path) {
							return {
								id,
								responseID: requestID,
								type: "not-found"
							};
						},
						logElementToConsole() {},
						getElementAttributeByPath() {},
						getElementSourceFunctionById() {},
						onErrorOrWarning,
						overrideError() {},
						overrideSuspense() {},
						overrideSuspenseMilestone() {},
						overrideValueAtPath() {},
						renamePath() {},
						renderer,
						setTraceUpdatesEnabled() {},
						setTrackedPath() {},
						startProfiling() {},
						stopProfiling() {},
						storeAsGlobal() {},
						supportsTogglingSuspense: false,
						updateComponentFilters() {},
						getEnvironmentNames() {
							return [];
						}
					};
				}
				function parseStackTraceFromChromeStack(stack, skipFrames) {
					if (stack.startsWith("Error: react-stack-top-frame\n")) stack = stack.slice(29);
					let idx = stack.indexOf("react_stack_bottom_frame");
					if (idx === -1) idx = stack.indexOf("react-stack-bottom-frame");
					if (idx !== -1) idx = stack.lastIndexOf("\n", idx);
					if (idx !== -1) stack = stack.slice(0, idx);
					const frames = stack.split("\n");
					const parsedFrames = [];
					for (let i = skipFrames; i < frames.length; i++) {
						const parsed = chromeFrameRegExp.exec(frames[i]);
						if (!parsed) continue;
						let name = parsed[1] || "";
						let isAsync = parsed[8] === "async ";
						if (name === "<anonymous>") name = "";
						else if (name.startsWith("async ")) {
							name = name.slice(5);
							isAsync = true;
						}
						let filename = parsed[2] || parsed[5] || "";
						if (filename === "<anonymous>") filename = "";
						const line = +(parsed[3] || parsed[6] || 0);
						const col = +(parsed[4] || parsed[7] || 0);
						parsedFrames.push([
							name,
							filename,
							line,
							col,
							0,
							0,
							isAsync
						]);
					}
					return parsedFrames;
				}
				const firefoxFrameRegExp = /^((?:.*".+")?[^@]*)@(.+):(\d+):(\d+)$/;
				function parseStackTraceFromFirefoxStack(stack, skipFrames) {
					let idx = stack.indexOf("react_stack_bottom_frame");
					if (idx === -1) idx = stack.indexOf("react-stack-bottom-frame");
					if (idx !== -1) idx = stack.lastIndexOf("\n", idx);
					if (idx !== -1) stack = stack.slice(0, idx);
					const frames = stack.split("\n");
					const parsedFrames = [];
					for (let i = skipFrames; i < frames.length; i++) {
						const parsed = firefoxFrameRegExp.exec(frames[i]);
						if (!parsed) continue;
						const name = parsed[1] || "";
						const filename = parsed[2] || "";
						const line = +parsed[3];
						const col = +parsed[4];
						parsedFrames.push([
							name,
							filename,
							line,
							col,
							0,
							0,
							false
						]);
					}
					return parsedFrames;
				}
				const CHROME_STACK_REGEXP = /^\s*at .*(\S+:\d+|\(native\))/m;
				function parseStackTraceFromString(stack, skipFrames) {
					if (stack.match(CHROME_STACK_REGEXP)) return parseStackTraceFromChromeStack(stack, skipFrames);
					return parseStackTraceFromFirefoxStack(stack, skipFrames);
				}
				let framesToSkip = 0;
				let collectedStackTrace = null;
				const identifierRegExp = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/;
				function getMethodCallName(callSite) {
					const typeName = callSite.getTypeName();
					const methodName = callSite.getMethodName();
					const functionName = callSite.getFunctionName();
					let result = "";
					if (functionName) {
						if (typeName && identifierRegExp.test(functionName) && functionName !== typeName) result += typeName + ".";
						result += functionName;
						if (methodName && functionName !== methodName && !functionName.endsWith("." + methodName) && !functionName.endsWith(" " + methodName)) result += " [as " + methodName + "]";
					} else {
						if (typeName) result += typeName + ".";
						if (methodName) result += methodName;
						else result += "<anonymous>";
					}
					return result;
				}
				function collectStackTrace(error, structuredStackTrace) {
					const result = [];
					for (let i = framesToSkip; i < structuredStackTrace.length; i++) {
						const callSite = structuredStackTrace[i];
						let name = callSite.getFunctionName() || "<anonymous>";
						if (name.includes("react_stack_bottom_frame") || name.includes("react-stack-bottom-frame")) break;
						else if (callSite.isNative()) {
							const isAsync = callSite.isAsync();
							result.push([
								name,
								"",
								0,
								0,
								0,
								0,
								isAsync
							]);
						} else {
							if (callSite.isConstructor()) name = "new " + name;
							else if (!callSite.isToplevel()) name = getMethodCallName(callSite);
							if (name === "<anonymous>") name = "";
							let filename = callSite.getScriptNameOrSourceURL() || "<anonymous>";
							if (filename === "<anonymous>") {
								filename = "";
								if (callSite.isEval()) {
									const origin = callSite.getEvalOrigin();
									if (origin) filename = origin.toString() + ", <anonymous>";
								}
							}
							const line = callSite.getLineNumber() || 0;
							const col = callSite.getColumnNumber() || 0;
							const enclosingLine = typeof callSite.getEnclosingLineNumber === "function" ? callSite.getEnclosingLineNumber() || 0 : 0;
							const enclosingCol = typeof callSite.getEnclosingColumnNumber === "function" ? callSite.getEnclosingColumnNumber() || 0 : 0;
							const isAsync = callSite.isAsync();
							result.push([
								name,
								filename,
								line,
								col,
								enclosingLine,
								enclosingCol,
								isAsync
							]);
						}
					}
					collectedStackTrace = result;
					const name = error.name || "Error";
					const message = error.message || "";
					let stack = name + ": " + message;
					for (let i = 0; i < structuredStackTrace.length; i++) stack += "\n    at " + structuredStackTrace[i].toString();
					return stack;
				}
				const chromeFrameRegExp = /^ *at (?:(.+) \((?:(.+):(\d+):(\d+)|\<anonymous\>)\)|(?:async )?(.+):(\d+):(\d+)|\<anonymous\>)$/;
				const stackTraceCache = /* @__PURE__ */ new WeakMap();
				function parseStackTrace(error, skipFrames) {
					const existing = stackTraceCache.get(error);
					if (existing !== void 0) return existing;
					collectedStackTrace = null;
					framesToSkip = skipFrames;
					const previousPrepare = Error.prepareStackTrace;
					Error.prepareStackTrace = collectStackTrace;
					let stack;
					try {
						stack = String(error.stack);
					} finally {
						Error.prepareStackTrace = previousPrepare;
					}
					if (collectedStackTrace !== null) {
						const result = collectedStackTrace;
						collectedStackTrace = null;
						stackTraceCache.set(error, result);
						return result;
					}
					const parsedFrames = parseStackTraceFromString(stack, skipFrames);
					stackTraceCache.set(error, parsedFrames);
					return parsedFrames;
				}
				function extractLocationFromOwnerStack(error) {
					const stackTrace = parseStackTrace(error, 1);
					const stack = error.stack;
					if (!stack.includes("react_stack_bottom_frame") && !stack.includes("react-stack-bottom-frame")) return null;
					for (let i = stackTrace.length - 1; i >= 0; i--) {
						const [functionName, fileName, line, col, encLine, encCol] = stackTrace[i];
						if (fileName.indexOf(":") !== -1) return [
							functionName,
							fileName,
							encLine || line,
							encCol || col
						];
					}
					return null;
				}
				function extractLocationFromComponentStack(stack) {
					const stackTrace = parseStackTraceFromString(stack, 0);
					for (let i = 0; i < stackTrace.length; i++) {
						const [functionName, fileName, line, col, encLine, encCol] = stackTrace[i];
						if (fileName.indexOf(":") !== -1) return [
							functionName,
							fileName,
							encLine || line,
							encCol || col
						];
					}
					return null;
				}
				var error_stack_parser = __webpack_require__(2235);
				var error_stack_parser_default = /* @__PURE__ */ __webpack_require__.n(error_stack_parser);
				const shared_assign = Object.assign;
				const shared_ReactSharedInternals = require_react().__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
				const FunctionComponent = 0;
				const ContextProvider = 10;
				const ForwardRef = 11;
				const SimpleMemoComponent = 15;
				const shared_hasOwnProperty = Object.prototype.hasOwnProperty;
				let hookLog = [];
				let primitiveStackCache = null;
				function getPrimitiveStackCache() {
					if (primitiveStackCache === null) {
						const cache = /* @__PURE__ */ new Map();
						let readHookLog;
						try {
							Dispatcher.useContext({ _currentValue: null });
							Dispatcher.useState(null);
							Dispatcher.useReducer((s, a) => s, null);
							Dispatcher.useRef(null);
							if (typeof Dispatcher.useCacheRefresh === "function") Dispatcher.useCacheRefresh();
							Dispatcher.useLayoutEffect(() => {});
							Dispatcher.useInsertionEffect(() => {});
							Dispatcher.useEffect(() => {});
							Dispatcher.useImperativeHandle(void 0, () => null);
							Dispatcher.useDebugValue(null);
							Dispatcher.useCallback(() => {});
							Dispatcher.useTransition();
							Dispatcher.useSyncExternalStore(() => () => {}, () => null, () => null);
							Dispatcher.useDeferredValue(null);
							Dispatcher.useMemo(() => null);
							Dispatcher.useOptimistic(null, (s, a) => s);
							Dispatcher.useFormState((s, p) => s, null);
							Dispatcher.useActionState((s, p) => s, null);
							Dispatcher.useHostTransitionStatus();
							if (typeof Dispatcher.useMemoCache === "function") Dispatcher.useMemoCache(0);
							if (typeof Dispatcher.use === "function") {
								Dispatcher.use({
									$$typeof: REACT_CONTEXT_TYPE,
									_currentValue: null
								});
								Dispatcher.use({
									then() {},
									status: "fulfilled",
									value: null
								});
								try {
									Dispatcher.use({ then() {} });
								} catch (x) {}
							}
							Dispatcher.useId();
							if (typeof Dispatcher.useEffectEvent === "function") Dispatcher.useEffectEvent((args) => {});
						} finally {
							readHookLog = hookLog;
							hookLog = [];
						}
						for (let i = 0; i < readHookLog.length; i++) {
							const hook = readHookLog[i];
							cache.set(hook.primitive, error_stack_parser_default().parse(hook.stackError));
						}
						primitiveStackCache = cache;
					}
					return primitiveStackCache;
				}
				let currentFiber = null;
				let currentHook = null;
				let currentContextDependency = null;
				let currentThenableIndex = 0;
				let currentThenableState = null;
				function nextHook() {
					const hook = currentHook;
					if (hook !== null) currentHook = hook.next;
					return hook;
				}
				function readContext(context) {
					if (currentFiber === null) return context._currentValue;
					else {
						if (currentContextDependency === null) throw new Error("Context reads do not line up with context dependencies. This is a bug in React Debug Tools.");
						let value;
						if (shared_hasOwnProperty.call(currentContextDependency, "memoizedValue")) {
							value = currentContextDependency.memoizedValue;
							currentContextDependency = currentContextDependency.next;
						} else value = context._currentValue;
						return value;
					}
				}
				const SuspenseException = /* @__PURE__ */ new Error("Suspense Exception: This is not a real error! It's an implementation detail of `use` to interrupt the current render. You must either rethrow it immediately, or move the `use` call outside of the `try/catch` block. Capturing without rethrowing will lead to unexpected behavior.\n\nTo handle async errors, wrap your component in an error boundary, or call the promise's `.catch` method and pass the result to `use`.");
				function use(usable) {
					if (usable !== null && typeof usable === "object") {
						if (typeof usable.then === "function") {
							const thenable = currentThenableState !== null && currentThenableIndex < currentThenableState.length ? currentThenableState[currentThenableIndex++] : usable;
							switch (thenable.status) {
								case "fulfilled": {
									const fulfilledValue = thenable.value;
									hookLog.push({
										displayName: null,
										primitive: "Promise",
										stackError: /* @__PURE__ */ new Error(),
										value: fulfilledValue,
										debugInfo: thenable._debugInfo === void 0 ? null : thenable._debugInfo,
										dispatcherHookName: "Use"
									});
									return fulfilledValue;
								}
								case "rejected": throw thenable.reason;
							}
							hookLog.push({
								displayName: null,
								primitive: "Unresolved",
								stackError: /* @__PURE__ */ new Error(),
								value: thenable,
								debugInfo: thenable._debugInfo === void 0 ? null : thenable._debugInfo,
								dispatcherHookName: "Use"
							});
							throw SuspenseException;
						} else if (usable.$$typeof === REACT_CONTEXT_TYPE) {
							const context = usable;
							const value = readContext(context);
							hookLog.push({
								displayName: context.displayName || "Context",
								primitive: "Context (use)",
								stackError: /* @__PURE__ */ new Error(),
								value,
								debugInfo: null,
								dispatcherHookName: "Use"
							});
							return value;
						}
					}
					throw new Error("An unsupported type was passed to use(): " + String(usable));
				}
				function useContext(context) {
					const value = readContext(context);
					hookLog.push({
						displayName: context.displayName || null,
						primitive: "Context",
						stackError: /* @__PURE__ */ new Error(),
						value,
						debugInfo: null,
						dispatcherHookName: "Context"
					});
					return value;
				}
				function useState(initialState) {
					const hook = nextHook();
					const state = hook !== null ? hook.memoizedState : typeof initialState === "function" ? initialState() : initialState;
					hookLog.push({
						displayName: null,
						primitive: "State",
						stackError: /* @__PURE__ */ new Error(),
						value: state,
						debugInfo: null,
						dispatcherHookName: "State"
					});
					return [state, (action) => {}];
				}
				function useReducer(reducer, initialArg, init) {
					const hook = nextHook();
					let state;
					if (hook !== null) state = hook.memoizedState;
					else state = init !== void 0 ? init(initialArg) : initialArg;
					hookLog.push({
						displayName: null,
						primitive: "Reducer",
						stackError: /* @__PURE__ */ new Error(),
						value: state,
						debugInfo: null,
						dispatcherHookName: "Reducer"
					});
					return [state, (action) => {}];
				}
				function useRef(initialValue) {
					const hook = nextHook();
					const ref = hook !== null ? hook.memoizedState : { current: initialValue };
					hookLog.push({
						displayName: null,
						primitive: "Ref",
						stackError: /* @__PURE__ */ new Error(),
						value: ref.current,
						debugInfo: null,
						dispatcherHookName: "Ref"
					});
					return ref;
				}
				function useCacheRefresh() {
					const hook = nextHook();
					hookLog.push({
						displayName: null,
						primitive: "CacheRefresh",
						stackError: /* @__PURE__ */ new Error(),
						value: hook !== null ? hook.memoizedState : function refresh() {},
						debugInfo: null,
						dispatcherHookName: "CacheRefresh"
					});
					return () => {};
				}
				function useLayoutEffect(create, inputs) {
					nextHook();
					hookLog.push({
						displayName: null,
						primitive: "LayoutEffect",
						stackError: /* @__PURE__ */ new Error(),
						value: create,
						debugInfo: null,
						dispatcherHookName: "LayoutEffect"
					});
				}
				function useInsertionEffect(create, inputs) {
					nextHook();
					hookLog.push({
						displayName: null,
						primitive: "InsertionEffect",
						stackError: /* @__PURE__ */ new Error(),
						value: create,
						debugInfo: null,
						dispatcherHookName: "InsertionEffect"
					});
				}
				function useEffect(create, deps) {
					nextHook();
					hookLog.push({
						displayName: null,
						primitive: "Effect",
						stackError: /* @__PURE__ */ new Error(),
						value: create,
						debugInfo: null,
						dispatcherHookName: "Effect"
					});
				}
				function useImperativeHandle(ref, create, inputs) {
					nextHook();
					let instance = void 0;
					if (ref !== null && typeof ref === "object") instance = ref.current;
					hookLog.push({
						displayName: null,
						primitive: "ImperativeHandle",
						stackError: /* @__PURE__ */ new Error(),
						value: instance,
						debugInfo: null,
						dispatcherHookName: "ImperativeHandle"
					});
				}
				function useDebugValue(value, formatterFn) {
					hookLog.push({
						displayName: null,
						primitive: "DebugValue",
						stackError: /* @__PURE__ */ new Error(),
						value: typeof formatterFn === "function" ? formatterFn(value) : value,
						debugInfo: null,
						dispatcherHookName: "DebugValue"
					});
				}
				function useCallback(callback, inputs) {
					const hook = nextHook();
					hookLog.push({
						displayName: null,
						primitive: "Callback",
						stackError: /* @__PURE__ */ new Error(),
						value: hook !== null ? hook.memoizedState[0] : callback,
						debugInfo: null,
						dispatcherHookName: "Callback"
					});
					return callback;
				}
				function useMemo(nextCreate, inputs) {
					const hook = nextHook();
					const value = hook !== null ? hook.memoizedState[0] : nextCreate();
					hookLog.push({
						displayName: null,
						primitive: "Memo",
						stackError: /* @__PURE__ */ new Error(),
						value,
						debugInfo: null,
						dispatcherHookName: "Memo"
					});
					return value;
				}
				function useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
					nextHook();
					nextHook();
					const value = getSnapshot();
					hookLog.push({
						displayName: null,
						primitive: "SyncExternalStore",
						stackError: /* @__PURE__ */ new Error(),
						value,
						debugInfo: null,
						dispatcherHookName: "SyncExternalStore"
					});
					return value;
				}
				function useTransition() {
					const stateHook = nextHook();
					nextHook();
					const isPending = stateHook !== null ? stateHook.memoizedState : false;
					hookLog.push({
						displayName: null,
						primitive: "Transition",
						stackError: /* @__PURE__ */ new Error(),
						value: isPending,
						debugInfo: null,
						dispatcherHookName: "Transition"
					});
					return [isPending, () => {}];
				}
				function useDeferredValue(value, initialValue) {
					const hook = nextHook();
					const prevValue = hook !== null ? hook.memoizedState : value;
					hookLog.push({
						displayName: null,
						primitive: "DeferredValue",
						stackError: /* @__PURE__ */ new Error(),
						value: prevValue,
						debugInfo: null,
						dispatcherHookName: "DeferredValue"
					});
					return prevValue;
				}
				function useId() {
					const hook = nextHook();
					const id = hook !== null ? hook.memoizedState : "";
					hookLog.push({
						displayName: null,
						primitive: "Id",
						stackError: /* @__PURE__ */ new Error(),
						value: id,
						debugInfo: null,
						dispatcherHookName: "Id"
					});
					return id;
				}
				function useMemoCache(size) {
					const fiber = currentFiber;
					if (fiber == null) return [];
					const memoCache = fiber.updateQueue != null ? fiber.updateQueue.memoCache : null;
					if (memoCache == null) return [];
					let data = memoCache.data[memoCache.index];
					if (data === void 0) {
						data = memoCache.data[memoCache.index] = new Array(size);
						for (let i = 0; i < size; i++) data[i] = REACT_MEMO_CACHE_SENTINEL;
					}
					memoCache.index++;
					return data;
				}
				function useOptimistic(passthrough, reducer) {
					const hook = nextHook();
					let state;
					if (hook !== null) state = hook.memoizedState;
					else state = passthrough;
					hookLog.push({
						displayName: null,
						primitive: "Optimistic",
						stackError: /* @__PURE__ */ new Error(),
						value: state,
						debugInfo: null,
						dispatcherHookName: "Optimistic"
					});
					return [state, (action) => {}];
				}
				function useFormState(action, initialState, permalink) {
					const hook = nextHook();
					nextHook();
					nextHook();
					const stackError = /* @__PURE__ */ new Error();
					let value;
					let debugInfo = null;
					let error = null;
					if (hook !== null) {
						const actionResult = hook.memoizedState;
						if (typeof actionResult === "object" && actionResult !== null && typeof actionResult.then === "function") {
							const thenable = actionResult;
							switch (thenable.status) {
								case "fulfilled":
									value = thenable.value;
									debugInfo = thenable._debugInfo === void 0 ? null : thenable._debugInfo;
									break;
								case "rejected":
									error = thenable.reason;
									break;
								default:
									error = SuspenseException;
									debugInfo = thenable._debugInfo === void 0 ? null : thenable._debugInfo;
									value = thenable;
							}
						} else value = actionResult;
					} else value = initialState;
					hookLog.push({
						displayName: null,
						primitive: "FormState",
						stackError,
						value,
						debugInfo,
						dispatcherHookName: "FormState"
					});
					if (error !== null) throw error;
					return [
						value,
						(payload) => {},
						false
					];
				}
				function useActionState(action, initialState, permalink) {
					const hook = nextHook();
					nextHook();
					nextHook();
					const stackError = /* @__PURE__ */ new Error();
					let value;
					let debugInfo = null;
					let error = null;
					if (hook !== null) {
						const actionResult = hook.memoizedState;
						if (typeof actionResult === "object" && actionResult !== null && typeof actionResult.then === "function") {
							const thenable = actionResult;
							switch (thenable.status) {
								case "fulfilled":
									value = thenable.value;
									debugInfo = thenable._debugInfo === void 0 ? null : thenable._debugInfo;
									break;
								case "rejected":
									error = thenable.reason;
									break;
								default:
									error = SuspenseException;
									debugInfo = thenable._debugInfo === void 0 ? null : thenable._debugInfo;
									value = thenable;
							}
						} else value = actionResult;
					} else value = initialState;
					hookLog.push({
						displayName: null,
						primitive: "ActionState",
						stackError,
						value,
						debugInfo,
						dispatcherHookName: "ActionState"
					});
					if (error !== null) throw error;
					return [
						value,
						(payload) => {},
						false
					];
				}
				function useHostTransitionStatus() {
					const status = readContext({ _currentValue: null });
					hookLog.push({
						displayName: null,
						primitive: "HostTransitionStatus",
						stackError: /* @__PURE__ */ new Error(),
						value: status,
						debugInfo: null,
						dispatcherHookName: "HostTransitionStatus"
					});
					return status;
				}
				function useEffectEvent(callback) {
					nextHook();
					hookLog.push({
						displayName: null,
						primitive: "EffectEvent",
						stackError: /* @__PURE__ */ new Error(),
						value: callback,
						debugInfo: null,
						dispatcherHookName: "EffectEvent"
					});
					return callback;
				}
				const Dispatcher = {
					readContext,
					use,
					useCallback,
					useContext,
					useEffect,
					useImperativeHandle,
					useLayoutEffect,
					useInsertionEffect,
					useMemo,
					useReducer,
					useRef,
					useState,
					useDebugValue,
					useDeferredValue,
					useTransition,
					useSyncExternalStore,
					useId,
					useHostTransitionStatus,
					useFormState,
					useActionState,
					useOptimistic,
					useMemoCache,
					useCacheRefresh,
					useEffectEvent
				};
				const DispatcherProxy = typeof Proxy === "undefined" ? Dispatcher : new Proxy(Dispatcher, { get(target, prop) {
					if (target.hasOwnProperty(prop)) return target[prop];
					const error = /* @__PURE__ */ new Error("Missing method in Dispatcher: " + prop);
					error.name = "ReactDebugToolsUnsupportedHookError";
					throw error;
				} });
				let mostLikelyAncestorIndex = 0;
				function findSharedIndex(hookStack, rootStack, rootIndex) {
					const source = rootStack[rootIndex].source;
					hookSearch: for (let i = 0; i < hookStack.length; i++) if (hookStack[i].source === source) {
						for (let a = rootIndex + 1, b = i + 1; a < rootStack.length && b < hookStack.length; a++, b++) if (hookStack[b].source !== rootStack[a].source) continue hookSearch;
						return i;
					}
					return -1;
				}
				function findCommonAncestorIndex(rootStack, hookStack) {
					let rootIndex = findSharedIndex(hookStack, rootStack, mostLikelyAncestorIndex);
					if (rootIndex !== -1) return rootIndex;
					for (let i = 0; i < rootStack.length && i < 5; i++) {
						rootIndex = findSharedIndex(hookStack, rootStack, i);
						if (rootIndex !== -1) {
							mostLikelyAncestorIndex = i;
							return rootIndex;
						}
					}
					return -1;
				}
				function isReactWrapper(functionName, wrapperName) {
					const hookName = parseHookName(functionName);
					if (wrapperName === "HostTransitionStatus") return hookName === wrapperName || hookName === "FormStatus";
					return hookName === wrapperName;
				}
				function findPrimitiveIndex(hookStack, hook) {
					const primitiveStack = getPrimitiveStackCache().get(hook.primitive);
					if (primitiveStack === void 0) return -1;
					for (let i = 0; i < primitiveStack.length && i < hookStack.length; i++) if (primitiveStack[i].source !== hookStack[i].source) {
						if (i < hookStack.length - 1 && isReactWrapper(hookStack[i].functionName, hook.dispatcherHookName)) i++;
						if (i < hookStack.length - 1 && isReactWrapper(hookStack[i].functionName, hook.dispatcherHookName)) i++;
						return i;
					}
					return -1;
				}
				function parseTrimmedStack(rootStack, hook) {
					const hookStack = error_stack_parser_default().parse(hook.stackError);
					const rootIndex = findCommonAncestorIndex(rootStack, hookStack);
					const primitiveIndex = findPrimitiveIndex(hookStack, hook);
					if (rootIndex === -1 || primitiveIndex === -1 || rootIndex - primitiveIndex < 2) if (primitiveIndex === -1) return [null, null];
					else return [hookStack[primitiveIndex - 1], null];
					return [hookStack[primitiveIndex - 1], hookStack.slice(primitiveIndex, rootIndex - 1)];
				}
				function parseHookName(functionName) {
					if (!functionName) return "";
					let startIndex = functionName.lastIndexOf("[as ");
					if (startIndex !== -1) return parseHookName(functionName.slice(startIndex + 4, -1));
					startIndex = functionName.lastIndexOf(".");
					if (startIndex === -1) startIndex = 0;
					else startIndex += 1;
					if (functionName.slice(startIndex).startsWith("unstable_")) startIndex += 9;
					if (functionName.slice(startIndex).startsWith("experimental_")) startIndex += 13;
					if (functionName.slice(startIndex, startIndex + 3) === "use") {
						if (functionName.length - startIndex === 3) return "Use";
						startIndex += 3;
					}
					return functionName.slice(startIndex);
				}
				function buildTree(rootStack, readHookLog) {
					const rootChildren = [];
					let prevStack = null;
					let levelChildren = rootChildren;
					let nativeHookID = 0;
					const stackOfChildren = [];
					for (let i = 0; i < readHookLog.length; i++) {
						const hook = readHookLog[i];
						const parseResult = parseTrimmedStack(rootStack, hook);
						const primitiveFrame = parseResult[0];
						const stack = parseResult[1];
						let displayName = hook.displayName;
						if (displayName === null && primitiveFrame !== null) displayName = parseHookName(primitiveFrame.functionName) || parseHookName(hook.dispatcherHookName);
						if (stack !== null) {
							let commonSteps = 0;
							if (prevStack !== null) {
								while (commonSteps < stack.length && commonSteps < prevStack.length) {
									if (stack[stack.length - commonSteps - 1].source !== prevStack[prevStack.length - commonSteps - 1].source) break;
									commonSteps++;
								}
								for (let j = prevStack.length - 1; j > commonSteps; j--) levelChildren = stackOfChildren.pop();
							}
							for (let j = stack.length - commonSteps - 1; j >= 1; j--) {
								const children = [];
								const stackFrame = stack[j];
								const levelChild = {
									id: null,
									isStateEditable: false,
									name: parseHookName(stack[j - 1].functionName),
									value: void 0,
									subHooks: children,
									debugInfo: null,
									hookSource: {
										lineNumber: stackFrame.lineNumber === void 0 ? null : stackFrame.lineNumber,
										columnNumber: stackFrame.columnNumber === void 0 ? null : stackFrame.columnNumber,
										functionName: stackFrame.functionName === void 0 ? null : stackFrame.functionName,
										fileName: stackFrame.fileName === void 0 ? null : stackFrame.fileName
									}
								};
								levelChildren.push(levelChild);
								stackOfChildren.push(levelChildren);
								levelChildren = children;
							}
							prevStack = stack;
						}
						const { primitive, debugInfo } = hook;
						const levelChild = {
							id: primitive === "Context" || primitive === "Context (use)" || primitive === "DebugValue" || primitive === "Promise" || primitive === "Unresolved" || primitive === "HostTransitionStatus" ? null : nativeHookID++,
							isStateEditable: primitive === "Reducer" || primitive === "State",
							name: displayName || primitive,
							value: hook.value,
							subHooks: [],
							debugInfo,
							hookSource: null
						};
						const hookSource = {
							lineNumber: null,
							functionName: null,
							fileName: null,
							columnNumber: null
						};
						if (stack && stack.length >= 1) {
							const stackFrame = stack[0];
							hookSource.lineNumber = stackFrame.lineNumber === void 0 ? null : stackFrame.lineNumber;
							hookSource.functionName = stackFrame.functionName === void 0 ? null : stackFrame.functionName;
							hookSource.fileName = stackFrame.fileName === void 0 ? null : stackFrame.fileName;
							hookSource.columnNumber = stackFrame.columnNumber === void 0 ? null : stackFrame.columnNumber;
						}
						levelChild.hookSource = hookSource;
						levelChildren.push(levelChild);
					}
					processDebugValues(rootChildren, null);
					return rootChildren;
				}
				function processDebugValues(hooksTree, parentHooksNode) {
					const debugValueHooksNodes = [];
					for (let i = 0; i < hooksTree.length; i++) {
						const hooksNode = hooksTree[i];
						if (hooksNode.name === "DebugValue" && hooksNode.subHooks.length === 0) {
							hooksTree.splice(i, 1);
							i--;
							debugValueHooksNodes.push(hooksNode);
						} else processDebugValues(hooksNode.subHooks, hooksNode);
					}
					if (parentHooksNode !== null) {
						if (debugValueHooksNodes.length === 1) parentHooksNode.value = debugValueHooksNodes[0].value;
						else if (debugValueHooksNodes.length > 1) parentHooksNode.value = debugValueHooksNodes.map(({ value }) => value);
					}
				}
				function handleRenderFunctionError(error) {
					if (error === SuspenseException) return;
					if (error instanceof Error && error.name === "ReactDebugToolsUnsupportedHookError") throw error;
					const wrapperError = new Error("Error rendering inspected component", { cause: error });
					wrapperError.name = "ReactDebugToolsRenderError";
					wrapperError.cause = error;
					throw wrapperError;
				}
				function inspectHooks(renderFunction, props, currentDispatcher) {
					if (currentDispatcher == null) currentDispatcher = shared_ReactSharedInternals;
					const previousDispatcher = currentDispatcher.H;
					currentDispatcher.H = DispatcherProxy;
					let readHookLog;
					let ancestorStackError;
					try {
						ancestorStackError = /* @__PURE__ */ new Error();
						renderFunction(props);
					} catch (error) {
						handleRenderFunctionError(error);
					} finally {
						readHookLog = hookLog;
						hookLog = [];
						currentDispatcher.H = previousDispatcher;
					}
					return buildTree(ancestorStackError === void 0 ? [] : error_stack_parser_default().parse(ancestorStackError), readHookLog);
				}
				function setupContexts(contextMap, fiber) {
					let current = fiber;
					while (current) {
						if (current.tag === ContextProvider) {
							let context = current.type;
							if (context._context !== void 0) context = context._context;
							if (!contextMap.has(context)) {
								contextMap.set(context, context._currentValue);
								context._currentValue = current.memoizedProps.value;
							}
						}
						current = current.return;
					}
				}
				function restoreContexts(contextMap) {
					contextMap.forEach((value, context) => context._currentValue = value);
				}
				function inspectHooksOfForwardRef(renderFunction, props, ref, currentDispatcher) {
					const previousDispatcher = currentDispatcher.H;
					let readHookLog;
					currentDispatcher.H = DispatcherProxy;
					let ancestorStackError;
					try {
						ancestorStackError = /* @__PURE__ */ new Error();
						renderFunction(props, ref);
					} catch (error) {
						handleRenderFunctionError(error);
					} finally {
						readHookLog = hookLog;
						hookLog = [];
						currentDispatcher.H = previousDispatcher;
					}
					return buildTree(ancestorStackError === void 0 ? [] : error_stack_parser_default().parse(ancestorStackError), readHookLog);
				}
				function resolveDefaultProps(Component, baseProps) {
					if (Component && Component.defaultProps) {
						const props = shared_assign({}, baseProps);
						const defaultProps = Component.defaultProps;
						for (const propName in defaultProps) if (props[propName] === void 0) props[propName] = defaultProps[propName];
						return props;
					}
					return baseProps;
				}
				function inspectHooksOfFiber(fiber, currentDispatcher) {
					if (currentDispatcher == null) currentDispatcher = shared_ReactSharedInternals;
					if (fiber.tag !== FunctionComponent && fiber.tag !== SimpleMemoComponent && fiber.tag !== ForwardRef) throw new Error("Unknown Fiber. Needs to be a function component to inspect hooks.");
					getPrimitiveStackCache();
					currentHook = fiber.memoizedState;
					currentFiber = fiber;
					const thenableState = fiber.dependencies && fiber.dependencies._debugThenableState;
					const usedThenables = thenableState ? thenableState.thenables || thenableState : null;
					currentThenableState = Array.isArray(usedThenables) ? usedThenables : null;
					currentThenableIndex = 0;
					if (shared_hasOwnProperty.call(currentFiber, "dependencies")) {
						const dependencies = currentFiber.dependencies;
						currentContextDependency = dependencies !== null ? dependencies.firstContext : null;
					} else if (shared_hasOwnProperty.call(currentFiber, "dependencies_old")) {
						const dependencies = currentFiber.dependencies_old;
						currentContextDependency = dependencies !== null ? dependencies.firstContext : null;
					} else if (shared_hasOwnProperty.call(currentFiber, "dependencies_new")) {
						const dependencies = currentFiber.dependencies_new;
						currentContextDependency = dependencies !== null ? dependencies.firstContext : null;
					} else if (shared_hasOwnProperty.call(currentFiber, "contextDependencies")) {
						const contextDependencies = currentFiber.contextDependencies;
						currentContextDependency = contextDependencies !== null ? contextDependencies.first : null;
					} else throw new Error("Unsupported React version. This is a bug in React Debug Tools.");
					const type = fiber.type;
					let props = fiber.memoizedProps;
					if (type !== fiber.elementType) props = resolveDefaultProps(type, props);
					const contextMap = /* @__PURE__ */ new Map();
					try {
						if (currentContextDependency !== null && !shared_hasOwnProperty.call(currentContextDependency, "memoizedValue")) setupContexts(contextMap, fiber);
						if (fiber.tag === ForwardRef) return inspectHooksOfForwardRef(type.render, props, fiber.ref, currentDispatcher);
						return inspectHooks(type, props, currentDispatcher);
					} finally {
						currentFiber = null;
						currentHook = null;
						currentContextDependency = null;
						currentThenableState = null;
						currentThenableIndex = 0;
						restoreContexts(contextMap);
					}
				}
				const CONCURRENT_MODE_NUMBER = 60111;
				const CONCURRENT_MODE_SYMBOL_STRING = "Symbol(react.concurrent_mode)";
				const CONTEXT_NUMBER = 60110;
				const CONTEXT_SYMBOL_STRING = "Symbol(react.context)";
				const SERVER_CONTEXT_SYMBOL_STRING = "Symbol(react.server_context)";
				const DEPRECATED_ASYNC_MODE_SYMBOL_STRING = "Symbol(react.async_mode)";
				const FORWARD_REF_NUMBER = 60112;
				const FORWARD_REF_SYMBOL_STRING = "Symbol(react.forward_ref)";
				const LAZY_SYMBOL_STRING = "Symbol(react.lazy)";
				const MEMO_NUMBER = 60115;
				const MEMO_SYMBOL_STRING = "Symbol(react.memo)";
				const PROFILER_NUMBER = 60114;
				const PROFILER_SYMBOL_STRING = "Symbol(react.profiler)";
				const PROVIDER_NUMBER = 60109;
				const PROVIDER_SYMBOL_STRING = "Symbol(react.provider)";
				const CONSUMER_SYMBOL_STRING = "Symbol(react.consumer)";
				const SCOPE_NUMBER = 60119;
				const SCOPE_SYMBOL_STRING = "Symbol(react.scope)";
				const STRICT_MODE_NUMBER = 60108;
				const STRICT_MODE_SYMBOL_STRING = "Symbol(react.strict_mode)";
				const ReactSymbols_REACT_MEMO_CACHE_SENTINEL = Symbol.for("react.memo_cache_sentinel");
				function is(x, y) {
					return x === y && (x !== 0 || 1 / x === 1 / y) || x !== x && y !== y;
				}
				const shared_objectIs = typeof Object.is === "function" ? Object.is : is;
				function getIODescription(value) {
					return "";
				}
				function describeFiber(workTagMap, workInProgress, currentDispatcherRef) {
					const { HostHoistable, HostSingleton, HostComponent, LazyComponent, SuspenseComponent, SuspenseListComponent, FunctionComponent, IndeterminateComponent, SimpleMemoComponent, ForwardRef, ClassComponent, ViewTransitionComponent, ActivityComponent } = workTagMap;
					switch (workInProgress.tag) {
						case HostHoistable:
						case HostSingleton:
						case HostComponent: return describeBuiltInComponentFrame(workInProgress.type);
						case LazyComponent: return describeBuiltInComponentFrame("Lazy");
						case SuspenseComponent: return describeBuiltInComponentFrame("Suspense");
						case SuspenseListComponent: return describeBuiltInComponentFrame("SuspenseList");
						case ViewTransitionComponent: return describeBuiltInComponentFrame("ViewTransition");
						case ActivityComponent: return describeBuiltInComponentFrame("Activity");
						case FunctionComponent:
						case IndeterminateComponent:
						case SimpleMemoComponent: return describeFunctionComponentFrame(workInProgress.type, currentDispatcherRef);
						case ForwardRef: return describeFunctionComponentFrame(workInProgress.type.render, currentDispatcherRef);
						case ClassComponent: return describeClassComponentFrame(workInProgress.type, currentDispatcherRef);
						default: return "";
					}
				}
				function getStackByFiberInDevAndProd(workTagMap, workInProgress, currentDispatcherRef) {
					try {
						let info = "";
						let node = workInProgress;
						do {
							info += describeFiber(workTagMap, node, currentDispatcherRef);
							const debugInfo = node._debugInfo;
							if (debugInfo) for (let i = debugInfo.length - 1; i >= 0; i--) {
								const entry = debugInfo[i];
								if (typeof entry.name === "string") info += describeDebugInfoFrame(entry.name, entry.env);
							}
							node = node.return;
						} while (node);
						return info;
					} catch (x) {
						return "\nError generating stack: " + x.message + "\n" + x.stack;
					}
				}
				function getSourceLocationByFiber(workTagMap, fiber, currentDispatcherRef) {
					try {
						const info = describeFiber(workTagMap, fiber, currentDispatcherRef);
						if (info !== "") return info.slice(1);
					} catch (x) {
						console.error(x);
					}
					return null;
				}
				function DevToolsFiberComponentStack_supportsConsoleTasks(fiber) {
					return !!fiber._debugTask;
				}
				function supportsOwnerStacks(fiber) {
					return fiber._debugStack !== void 0;
				}
				function getOwnerStackByFiberInDev(workTagMap, workInProgress, currentDispatcherRef) {
					const { HostHoistable, HostSingleton, HostText, HostComponent, SuspenseComponent, SuspenseListComponent, ViewTransitionComponent, ActivityComponent } = workTagMap;
					try {
						let info = "";
						if (workInProgress.tag === HostText) workInProgress = workInProgress.return;
						switch (workInProgress.tag) {
							case HostHoistable:
							case HostSingleton:
							case HostComponent:
								info += describeBuiltInComponentFrame(workInProgress.type);
								break;
							case SuspenseComponent:
								info += describeBuiltInComponentFrame("Suspense");
								break;
							case SuspenseListComponent:
								info += describeBuiltInComponentFrame("SuspenseList");
								break;
							case ViewTransitionComponent:
								info += describeBuiltInComponentFrame("ViewTransition");
								break;
							case ActivityComponent:
								info += describeBuiltInComponentFrame("Activity");
								break;
						}
						let owner = workInProgress;
						while (owner) if (typeof owner.tag === "number") {
							const fiber = owner;
							owner = fiber._debugOwner;
							let debugStack = fiber._debugStack;
							if (owner && debugStack) {
								if (typeof debugStack !== "string") debugStack = formatOwnerStack(debugStack);
								if (debugStack !== "") info += "\n" + debugStack;
							}
						} else if (owner.debugStack != null) {
							const ownerStack = owner.debugStack;
							owner = owner.owner;
							if (owner && ownerStack) info += "\n" + formatOwnerStack(ownerStack);
						} else break;
						return info;
					} catch (x) {
						return "\nError generating stack: " + x.message + "\n" + x.stack;
					}
				}
				const cachedStyleNameToValueMap = /* @__PURE__ */ new Map();
				function crawlData(data, sources, resolvedStyles) {
					if (data == null) return;
					if (src_isArray(data)) data.forEach((entry) => {
						if (entry == null) return;
						if (src_isArray(entry)) crawlData(entry, sources, resolvedStyles);
						else crawlObjectProperties(entry, sources, resolvedStyles);
					});
					else crawlObjectProperties(data, sources, resolvedStyles);
					resolvedStyles = Object.fromEntries(Object.entries(resolvedStyles).sort());
				}
				function crawlObjectProperties(entry, sources, resolvedStyles) {
					Object.keys(entry).forEach((key) => {
						const value = entry[key];
						if (typeof value === "string") if (key === value) sources.add(key);
						else {
							const propertyValue = getPropertyValueForStyleName(value);
							if (propertyValue != null) resolvedStyles[key] = propertyValue;
						}
						else {
							const nestedStyle = {};
							resolvedStyles[key] = nestedStyle;
							crawlData([value], sources, nestedStyle);
						}
					});
				}
				function getPropertyValueForStyleName(styleName) {
					if (cachedStyleNameToValueMap.has(styleName)) return cachedStyleNameToValueMap.get(styleName);
					for (let styleSheetIndex = 0; styleSheetIndex < document.styleSheets.length; styleSheetIndex++) {
						const styleSheet = document.styleSheets[styleSheetIndex];
						let rules = null;
						try {
							rules = styleSheet.cssRules;
						} catch (_e) {
							continue;
						}
						for (let ruleIndex = 0; ruleIndex < rules.length; ruleIndex++) {
							if (!(rules[ruleIndex] instanceof CSSStyleRule)) continue;
							const { cssText, selectorText, style } = rules[ruleIndex];
							if (selectorText != null) {
								if (selectorText.startsWith(`.${styleName}`)) {
									const match = cssText.match(/{ *([a-z\-]+):/);
									if (match !== null) {
										const property = match[1];
										const value = style.getPropertyValue(property);
										cachedStyleNameToValueMap.set(styleName, value);
										return value;
									} else return null;
								}
							}
						}
					}
					return null;
				}
				const THEME_STYLES = {
					light: {
						"--color-attribute-name": "#ef6632",
						"--color-attribute-name-not-editable": "#23272f",
						"--color-attribute-name-inverted": "rgba(255, 255, 255, 0.7)",
						"--color-attribute-value": "#1a1aa6",
						"--color-attribute-value-inverted": "#ffffff",
						"--color-attribute-editable-value": "#1a1aa6",
						"--color-background": "#ffffff",
						"--color-background-hover": "rgba(0, 136, 250, 0.1)",
						"--color-background-inactive": "#e5e5e5",
						"--color-background-invalid": "#fff0f0",
						"--color-background-selected": "#0088fa",
						"--color-button-background": "#ffffff",
						"--color-button-background-focus": "#ededed",
						"--color-button-background-hover": "rgba(0, 0, 0, 0.2)",
						"--color-button": "#5f6673",
						"--color-button-disabled": "#cfd1d5",
						"--color-button-active": "#0088fa",
						"--color-button-focus": "#23272f",
						"--color-button-hover": "#23272f",
						"--color-border": "#eeeeee",
						"--color-commit-did-not-render-fill": "#cfd1d5",
						"--color-commit-did-not-render-fill-text": "#000000",
						"--color-commit-did-not-render-pattern": "#cfd1d5",
						"--color-commit-did-not-render-pattern-text": "#333333",
						"--color-commit-gradient-0": "#37afa9",
						"--color-commit-gradient-1": "#63b19e",
						"--color-commit-gradient-2": "#80b393",
						"--color-commit-gradient-3": "#97b488",
						"--color-commit-gradient-4": "#abb67d",
						"--color-commit-gradient-5": "#beb771",
						"--color-commit-gradient-6": "#cfb965",
						"--color-commit-gradient-7": "#dfba57",
						"--color-commit-gradient-8": "#efbb49",
						"--color-commit-gradient-9": "#febc38",
						"--color-commit-gradient-text": "#000000",
						"--color-component-name": "#6a51b2",
						"--color-component-name-inverted": "#ffffff",
						"--color-component-badge-background": "#e6e6e6",
						"--color-component-badge-background-inverted": "rgba(255, 255, 255, 0.25)",
						"--color-component-badge-count": "#777d88",
						"--color-component-badge-count-inverted": "rgba(255, 255, 255, 0.7)",
						"--color-console-error-badge-text": "#ffffff",
						"--color-console-error-background": "#fff0f0",
						"--color-console-error-border": "#ffd6d6",
						"--color-console-error-icon": "#eb3941",
						"--color-console-error-text": "#fe2e31",
						"--color-console-warning-badge-text": "#000000",
						"--color-console-warning-background": "#fffbe5",
						"--color-console-warning-border": "#fff5c1",
						"--color-console-warning-icon": "#f4bd00",
						"--color-console-warning-text": "#64460c",
						"--color-context-background": "rgba(0,0,0,.9)",
						"--color-context-background-hover": "rgba(255, 255, 255, 0.1)",
						"--color-context-background-selected": "#178fb9",
						"--color-context-border": "#3d424a",
						"--color-context-text": "#ffffff",
						"--color-context-text-selected": "#ffffff",
						"--color-dim": "#777d88",
						"--color-dimmer": "#cfd1d5",
						"--color-dimmest": "#eff0f1",
						"--color-error-background": "hsl(0, 100%, 97%)",
						"--color-error-border": "hsl(0, 100%, 92%)",
						"--color-error-text": "#ff0000",
						"--color-expand-collapse-toggle": "#777d88",
						"--color-forget-badge-background": "#2683e2",
						"--color-forget-badge-background-inverted": "#1a6bbc",
						"--color-forget-text": "#fff",
						"--color-link": "#0000ff",
						"--color-modal-background": "rgba(255, 255, 255, 0.75)",
						"--color-bridge-version-npm-background": "#eff0f1",
						"--color-bridge-version-npm-text": "#000000",
						"--color-bridge-version-number": "#0088fa",
						"--color-primitive-hook-badge-background": "#e5e5e5",
						"--color-primitive-hook-badge-text": "#5f6673",
						"--color-record-active": "#fc3a4b",
						"--color-record-hover": "#3578e5",
						"--color-record-inactive": "#0088fa",
						"--color-resize-bar": "#eeeeee",
						"--color-resize-bar-active": "#dcdcdc",
						"--color-resize-bar-border": "#d1d1d1",
						"--color-resize-bar-dot": "#333333",
						"--color-timeline-internal-module": "#d1d1d1",
						"--color-timeline-internal-module-hover": "#c9c9c9",
						"--color-timeline-internal-module-text": "#444",
						"--color-timeline-native-event": "#ccc",
						"--color-timeline-native-event-hover": "#aaa",
						"--color-timeline-network-primary": "#fcf3dc",
						"--color-timeline-network-primary-hover": "#f0e7d1",
						"--color-timeline-network-secondary": "#efc457",
						"--color-timeline-network-secondary-hover": "#e3ba52",
						"--color-timeline-priority-background": "#f6f6f6",
						"--color-timeline-priority-border": "#eeeeee",
						"--color-timeline-user-timing": "#c9cacd",
						"--color-timeline-user-timing-hover": "#93959a",
						"--color-timeline-react-idle": "#d3e5f6",
						"--color-timeline-react-idle-hover": "#c3d9ef",
						"--color-timeline-react-render": "#9fc3f3",
						"--color-timeline-react-render-hover": "#83afe9",
						"--color-timeline-react-render-text": "#11365e",
						"--color-timeline-react-commit": "#c88ff0",
						"--color-timeline-react-commit-hover": "#b281d6",
						"--color-timeline-react-commit-text": "#3e2c4a",
						"--color-timeline-react-layout-effects": "#b281d6",
						"--color-timeline-react-layout-effects-hover": "#9d71bd",
						"--color-timeline-react-layout-effects-text": "#3e2c4a",
						"--color-timeline-react-passive-effects": "#b281d6",
						"--color-timeline-react-passive-effects-hover": "#9d71bd",
						"--color-timeline-react-passive-effects-text": "#3e2c4a",
						"--color-timeline-react-schedule": "#9fc3f3",
						"--color-timeline-react-schedule-hover": "#2683E2",
						"--color-timeline-react-suspense-rejected": "#f1cc14",
						"--color-timeline-react-suspense-rejected-hover": "#ffdf37",
						"--color-timeline-react-suspense-resolved": "#a6e59f",
						"--color-timeline-react-suspense-resolved-hover": "#89d281",
						"--color-timeline-react-suspense-unresolved": "#c9cacd",
						"--color-timeline-react-suspense-unresolved-hover": "#93959a",
						"--color-timeline-thrown-error": "#ee1638",
						"--color-timeline-thrown-error-hover": "#da1030",
						"--color-timeline-text-color": "#000000",
						"--color-timeline-text-dim-color": "#ccc",
						"--color-timeline-react-work-border": "#eeeeee",
						"--color-timebar-background": "#f6f6f6",
						"--color-search-match": "yellow",
						"--color-search-match-current": "#f7923b",
						"--color-selected-tree-highlight-active": "rgba(0, 136, 250, 0.1)",
						"--color-selected-tree-highlight-inactive": "rgba(0, 0, 0, 0.05)",
						"--color-scroll-caret": "rgba(150, 150, 150, 0.5)",
						"--color-tab-selected-border": "#0088fa",
						"--color-text": "#000000",
						"--color-text-invalid": "#ff0000",
						"--color-text-selected": "#ffffff",
						"--color-toggle-background-invalid": "#fc3a4b",
						"--color-toggle-background-on": "#0088fa",
						"--color-toggle-background-off": "#cfd1d5",
						"--color-toggle-text": "#ffffff",
						"--color-warning-background": "#fb3655",
						"--color-warning-background-hover": "#f82042",
						"--color-warning-text-color": "#ffffff",
						"--color-warning-text-color-inverted": "#fd4d69",
						"--color-suspense-default": "#0088fa",
						"--color-transition-default": "#6a51b2",
						"--color-suspense-server": "#62bc6a",
						"--color-transition-server": "#3f7844",
						"--color-suspense-other": "#f3ce49",
						"--color-transition-other": "#917b2c",
						"--color-suspense-errored": "#d57066",
						"--color-scroll-thumb": "#c2c2c2",
						"--color-scroll-track": "#fafafa",
						"--color-tooltip-background": "rgba(0, 0, 0, 0.9)",
						"--color-tooltip-text": "#ffffff",
						"--elevation-4": "0 2px 4px -1px rgba(0,0,0,.2),0 4px 5px 0 rgba(0,0,0,.14),0 1px 10px 0 rgba(0,0,0,.12)"
					},
					dark: {
						"--color-attribute-name": "#9d87d2",
						"--color-attribute-name-not-editable": "#ededed",
						"--color-attribute-name-inverted": "#282828",
						"--color-attribute-value": "#cedae0",
						"--color-attribute-value-inverted": "#ffffff",
						"--color-attribute-editable-value": "yellow",
						"--color-background": "#282c34",
						"--color-background-hover": "rgba(255, 255, 255, 0.1)",
						"--color-background-inactive": "#3d424a",
						"--color-background-invalid": "#5c0000",
						"--color-background-selected": "#178fb9",
						"--color-button-background": "#282c34",
						"--color-button-background-focus": "#3d424a",
						"--color-button-background-hover": "rgba(255, 255, 255, 0.2)",
						"--color-button": "#afb3b9",
						"--color-button-active": "#61dafb",
						"--color-button-disabled": "#4f5766",
						"--color-button-focus": "#a2e9fc",
						"--color-button-hover": "#ededed",
						"--color-border": "#3d424a",
						"--color-commit-did-not-render-fill": "#777d88",
						"--color-commit-did-not-render-fill-text": "#000000",
						"--color-commit-did-not-render-pattern": "#666c77",
						"--color-commit-did-not-render-pattern-text": "#ffffff",
						"--color-commit-gradient-0": "#37afa9",
						"--color-commit-gradient-1": "#63b19e",
						"--color-commit-gradient-2": "#80b393",
						"--color-commit-gradient-3": "#97b488",
						"--color-commit-gradient-4": "#abb67d",
						"--color-commit-gradient-5": "#beb771",
						"--color-commit-gradient-6": "#cfb965",
						"--color-commit-gradient-7": "#dfba57",
						"--color-commit-gradient-8": "#efbb49",
						"--color-commit-gradient-9": "#febc38",
						"--color-commit-gradient-text": "#000000",
						"--color-component-name": "#61dafb",
						"--color-component-name-inverted": "#282828",
						"--color-component-badge-background": "#5e6167",
						"--color-component-badge-background-inverted": "#46494e",
						"--color-component-badge-count": "#8f949d",
						"--color-component-badge-count-inverted": "rgba(255, 255, 255, 0.85)",
						"--color-console-error-badge-text": "#000000",
						"--color-console-error-background": "#290000",
						"--color-console-error-border": "#5c0000",
						"--color-console-error-icon": "#eb3941",
						"--color-console-error-text": "#fc7f7f",
						"--color-console-warning-badge-text": "#000000",
						"--color-console-warning-background": "#332b00",
						"--color-console-warning-border": "#665500",
						"--color-console-warning-icon": "#f4bd00",
						"--color-console-warning-text": "#f5f2ed",
						"--color-context-background": "rgba(255,255,255,.95)",
						"--color-context-background-hover": "rgba(0, 136, 250, 0.1)",
						"--color-context-background-selected": "#0088fa",
						"--color-context-border": "#eeeeee",
						"--color-context-text": "#000000",
						"--color-context-text-selected": "#ffffff",
						"--color-dim": "#8f949d",
						"--color-dimmer": "#777d88",
						"--color-dimmest": "#4f5766",
						"--color-error-background": "#200",
						"--color-error-border": "#900",
						"--color-error-text": "#f55",
						"--color-expand-collapse-toggle": "#8f949d",
						"--color-forget-badge-background": "#2683e2",
						"--color-forget-badge-background-inverted": "#1a6bbc",
						"--color-forget-text": "#fff",
						"--color-link": "#61dafb",
						"--color-modal-background": "rgba(0, 0, 0, 0.75)",
						"--color-bridge-version-npm-background": "rgba(0, 0, 0, 0.25)",
						"--color-bridge-version-npm-text": "#ffffff",
						"--color-bridge-version-number": "yellow",
						"--color-primitive-hook-badge-background": "rgba(0, 0, 0, 0.25)",
						"--color-primitive-hook-badge-text": "rgba(255, 255, 255, 0.7)",
						"--color-record-active": "#fc3a4b",
						"--color-record-hover": "#a2e9fc",
						"--color-record-inactive": "#61dafb",
						"--color-resize-bar": "#282c34",
						"--color-resize-bar-active": "#31363f",
						"--color-resize-bar-border": "#3d424a",
						"--color-resize-bar-dot": "#cfd1d5",
						"--color-timeline-internal-module": "#303542",
						"--color-timeline-internal-module-hover": "#363b4a",
						"--color-timeline-internal-module-text": "#7f8899",
						"--color-timeline-native-event": "#b2b2b2",
						"--color-timeline-native-event-hover": "#949494",
						"--color-timeline-network-primary": "#fcf3dc",
						"--color-timeline-network-primary-hover": "#e3dbc5",
						"--color-timeline-network-secondary": "#efc457",
						"--color-timeline-network-secondary-hover": "#d6af4d",
						"--color-timeline-priority-background": "#1d2129",
						"--color-timeline-priority-border": "#282c34",
						"--color-timeline-user-timing": "#c9cacd",
						"--color-timeline-user-timing-hover": "#93959a",
						"--color-timeline-react-idle": "#3d485b",
						"--color-timeline-react-idle-hover": "#465269",
						"--color-timeline-react-render": "#2683E2",
						"--color-timeline-react-render-hover": "#1a76d4",
						"--color-timeline-react-render-text": "#11365e",
						"--color-timeline-react-commit": "#731fad",
						"--color-timeline-react-commit-hover": "#611b94",
						"--color-timeline-react-commit-text": "#e5c1ff",
						"--color-timeline-react-layout-effects": "#611b94",
						"--color-timeline-react-layout-effects-hover": "#51167a",
						"--color-timeline-react-layout-effects-text": "#e5c1ff",
						"--color-timeline-react-passive-effects": "#611b94",
						"--color-timeline-react-passive-effects-hover": "#51167a",
						"--color-timeline-react-passive-effects-text": "#e5c1ff",
						"--color-timeline-react-schedule": "#2683E2",
						"--color-timeline-react-schedule-hover": "#1a76d4",
						"--color-timeline-react-suspense-rejected": "#f1cc14",
						"--color-timeline-react-suspense-rejected-hover": "#e4c00f",
						"--color-timeline-react-suspense-resolved": "#a6e59f",
						"--color-timeline-react-suspense-resolved-hover": "#89d281",
						"--color-timeline-react-suspense-unresolved": "#c9cacd",
						"--color-timeline-react-suspense-unresolved-hover": "#93959a",
						"--color-timeline-thrown-error": "#fb3655",
						"--color-timeline-thrown-error-hover": "#f82042",
						"--color-timeline-text-color": "#282c34",
						"--color-timeline-text-dim-color": "#555b66",
						"--color-timeline-react-work-border": "#3d424a",
						"--color-timebar-background": "#1d2129",
						"--color-search-match": "yellow",
						"--color-search-match-current": "#f7923b",
						"--color-selected-tree-highlight-active": "rgba(23, 143, 185, 0.15)",
						"--color-selected-tree-highlight-inactive": "rgba(255, 255, 255, 0.05)",
						"--color-scroll-caret": "#4f5766",
						"--color-shadow": "rgba(0, 0, 0, 0.5)",
						"--color-tab-selected-border": "#178fb9",
						"--color-text": "#ffffff",
						"--color-text-invalid": "#ff8080",
						"--color-text-selected": "#ffffff",
						"--color-toggle-background-invalid": "#fc3a4b",
						"--color-toggle-background-on": "#178fb9",
						"--color-toggle-background-off": "#777d88",
						"--color-toggle-text": "#ffffff",
						"--color-warning-background": "#ee1638",
						"--color-warning-background-hover": "#da1030",
						"--color-warning-text-color": "#ffffff",
						"--color-warning-text-color-inverted": "#ee1638",
						"--color-suspense-default": "#61dafb",
						"--color-transition-default": "#6a51b2",
						"--color-suspense-server": "#62bc6a",
						"--color-transition-server": "#3f7844",
						"--color-suspense-other": "#f3ce49",
						"--color-transition-other": "#917b2c",
						"--color-suspense-errored": "#d57066",
						"--color-scroll-thumb": "#afb3b9",
						"--color-scroll-track": "#313640",
						"--color-tooltip-background": "rgba(255, 255, 255, 0.95)",
						"--color-tooltip-text": "#000000",
						"--elevation-4": "0 2px 8px 0 rgba(0,0,0,0.32),0 4px 12px 0 rgba(0,0,0,0.24),0 1px 10px 0 rgba(0,0,0,0.18)"
					},
					compact: {
						"--font-size-monospace-small": "9px",
						"--font-size-monospace-normal": "11px",
						"--font-size-monospace-large": "15px",
						"--font-size-sans-small": "10px",
						"--font-size-sans-normal": "12px",
						"--font-size-sans-large": "14px",
						"--line-height-data": "18px"
					},
					comfortable: {
						"--font-size-monospace-small": "10px",
						"--font-size-monospace-normal": "13px",
						"--font-size-monospace-large": "17px",
						"--font-size-sans-small": "12px",
						"--font-size-sans-normal": "14px",
						"--font-size-sans-large": "16px",
						"--line-height-data": "22px"
					}
				};
				parseInt(THEME_STYLES.comfortable["--line-height-data"], 10);
				parseInt(THEME_STYLES.compact["--line-height-data"], 10);
				const REACT_TOTAL_NUM_LANES = 31;
				const SCHEDULING_PROFILER_VERSION = 1;
				const TIME_OFFSET = 10;
				let performanceTarget = null;
				let supportsUserTiming = typeof performance !== "undefined" && typeof performance.mark === "function" && typeof performance.clearMarks === "function";
				let supportsUserTimingV3 = false;
				if (supportsUserTiming) {
					const CHECK_V3_MARK = "__v3";
					const markOptions = {};
					Object.defineProperty(markOptions, "startTime", {
						get: function() {
							supportsUserTimingV3 = true;
							return 0;
						},
						set: function() {}
					});
					try {
						performance.mark(CHECK_V3_MARK, markOptions);
					} catch (error) {} finally {
						performance.clearMarks(CHECK_V3_MARK);
					}
				}
				if (supportsUserTimingV3) performanceTarget = performance;
				const profilingHooks_getCurrentTime = typeof performance === "object" && typeof performance.now === "function" ? () => performance.now() : () => Date.now();
				function createProfilingHooks({ getDisplayNameForFiber, getIsProfiling, getLaneLabelMap, workTagMap, currentDispatcherRef, reactVersion }) {
					let currentBatchUID = 0;
					let currentReactComponentMeasure = null;
					let currentReactMeasuresStack = [];
					let currentTimelineData = null;
					let currentFiberStacks = /* @__PURE__ */ new Map();
					let isProfiling = false;
					let nextRenderShouldStartNewBatch = false;
					function getRelativeTime() {
						const currentTime = profilingHooks_getCurrentTime();
						if (currentTimelineData) {
							if (currentTimelineData.startTime === 0) currentTimelineData.startTime = currentTime - TIME_OFFSET;
							return currentTime - currentTimelineData.startTime;
						}
						return 0;
					}
					function getInternalModuleRanges() {
						if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== "undefined" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.getInternalModuleRanges === "function") {
							const ranges = __REACT_DEVTOOLS_GLOBAL_HOOK__.getInternalModuleRanges();
							if (shared_isArray(ranges)) return ranges;
						}
						return null;
					}
					function getTimelineData() {
						return currentTimelineData;
					}
					function laneToLanesArray(lanes) {
						const lanesArray = [];
						let lane = 1;
						for (let index = 0; index < REACT_TOTAL_NUM_LANES; index++) {
							if (lane & lanes) lanesArray.push(lane);
							lane *= 2;
						}
						return lanesArray;
					}
					const laneToLabelMap = typeof getLaneLabelMap === "function" ? getLaneLabelMap() : null;
					function markMetadata() {
						markAndClear(`--react-version-${reactVersion}`);
						markAndClear(`--profiler-version-${SCHEDULING_PROFILER_VERSION}`);
						const ranges = getInternalModuleRanges();
						if (ranges) for (let i = 0; i < ranges.length; i++) {
							const range = ranges[i];
							if (shared_isArray(range) && range.length === 2) {
								const [startStackFrame, stopStackFrame] = ranges[i];
								markAndClear(`--react-internal-module-start-${startStackFrame}`);
								markAndClear(`--react-internal-module-stop-${stopStackFrame}`);
							}
						}
						if (laneToLabelMap != null) markAndClear(`--react-lane-labels-${Array.from(laneToLabelMap.values()).join(",")}`);
					}
					function markAndClear(markName) {
						performanceTarget.mark(markName);
						performanceTarget.clearMarks(markName);
					}
					function recordReactMeasureStarted(type, lanes) {
						let depth = 0;
						if (currentReactMeasuresStack.length > 0) {
							const top = currentReactMeasuresStack[currentReactMeasuresStack.length - 1];
							depth = top.type === "render-idle" ? top.depth : top.depth + 1;
						}
						const lanesArray = laneToLanesArray(lanes);
						const reactMeasure = {
							type,
							batchUID: currentBatchUID,
							depth,
							lanes: lanesArray,
							timestamp: getRelativeTime(),
							duration: 0
						};
						currentReactMeasuresStack.push(reactMeasure);
						if (currentTimelineData) {
							const { batchUIDToMeasuresMap, laneToReactMeasureMap } = currentTimelineData;
							let reactMeasures = batchUIDToMeasuresMap.get(currentBatchUID);
							if (reactMeasures != null) reactMeasures.push(reactMeasure);
							else batchUIDToMeasuresMap.set(currentBatchUID, [reactMeasure]);
							lanesArray.forEach((lane) => {
								reactMeasures = laneToReactMeasureMap.get(lane);
								if (reactMeasures) reactMeasures.push(reactMeasure);
							});
						}
					}
					function recordReactMeasureCompleted(type) {
						const currentTime = getRelativeTime();
						if (currentReactMeasuresStack.length === 0) {
							console.error("Unexpected type \"%s\" completed at %sms while currentReactMeasuresStack is empty.", type, currentTime);
							return;
						}
						const top = currentReactMeasuresStack.pop();
						if (top.type !== type) console.error("Unexpected type \"%s\" completed at %sms before \"%s\" completed.", type, currentTime, top.type);
						top.duration = currentTime - top.timestamp;
						if (currentTimelineData) currentTimelineData.duration = getRelativeTime() + TIME_OFFSET;
					}
					function markCommitStarted(lanes) {
						if (!isProfiling) return;
						recordReactMeasureStarted("commit", lanes);
						nextRenderShouldStartNewBatch = true;
						if (supportsUserTimingV3) {
							markAndClear(`--commit-start-${lanes}`);
							markMetadata();
						}
					}
					function markCommitStopped() {
						if (!isProfiling) return;
						recordReactMeasureCompleted("commit");
						recordReactMeasureCompleted("render-idle");
						if (supportsUserTimingV3) markAndClear("--commit-stop");
					}
					function markComponentRenderStarted(fiber) {
						if (!isProfiling) return;
						const componentName = getDisplayNameForFiber(fiber) || "Unknown";
						currentReactComponentMeasure = {
							componentName,
							duration: 0,
							timestamp: getRelativeTime(),
							type: "render",
							warning: null
						};
						if (supportsUserTimingV3) markAndClear(`--component-render-start-${componentName}`);
					}
					function markComponentRenderStopped() {
						if (!isProfiling) return;
						if (currentReactComponentMeasure) {
							if (currentTimelineData) currentTimelineData.componentMeasures.push(currentReactComponentMeasure);
							currentReactComponentMeasure.duration = getRelativeTime() - currentReactComponentMeasure.timestamp;
							currentReactComponentMeasure = null;
						}
						if (supportsUserTimingV3) markAndClear("--component-render-stop");
					}
					function markComponentLayoutEffectMountStarted(fiber) {
						if (!isProfiling) return;
						const componentName = getDisplayNameForFiber(fiber) || "Unknown";
						currentReactComponentMeasure = {
							componentName,
							duration: 0,
							timestamp: getRelativeTime(),
							type: "layout-effect-mount",
							warning: null
						};
						if (supportsUserTimingV3) markAndClear(`--component-layout-effect-mount-start-${componentName}`);
					}
					function markComponentLayoutEffectMountStopped() {
						if (!isProfiling) return;
						if (currentReactComponentMeasure) {
							if (currentTimelineData) currentTimelineData.componentMeasures.push(currentReactComponentMeasure);
							currentReactComponentMeasure.duration = getRelativeTime() - currentReactComponentMeasure.timestamp;
							currentReactComponentMeasure = null;
						}
						if (supportsUserTimingV3) markAndClear("--component-layout-effect-mount-stop");
					}
					function markComponentLayoutEffectUnmountStarted(fiber) {
						if (!isProfiling) return;
						const componentName = getDisplayNameForFiber(fiber) || "Unknown";
						currentReactComponentMeasure = {
							componentName,
							duration: 0,
							timestamp: getRelativeTime(),
							type: "layout-effect-unmount",
							warning: null
						};
						if (supportsUserTimingV3) markAndClear(`--component-layout-effect-unmount-start-${componentName}`);
					}
					function markComponentLayoutEffectUnmountStopped() {
						if (!isProfiling) return;
						if (currentReactComponentMeasure) {
							if (currentTimelineData) currentTimelineData.componentMeasures.push(currentReactComponentMeasure);
							currentReactComponentMeasure.duration = getRelativeTime() - currentReactComponentMeasure.timestamp;
							currentReactComponentMeasure = null;
						}
						if (supportsUserTimingV3) markAndClear("--component-layout-effect-unmount-stop");
					}
					function markComponentPassiveEffectMountStarted(fiber) {
						if (!isProfiling) return;
						const componentName = getDisplayNameForFiber(fiber) || "Unknown";
						currentReactComponentMeasure = {
							componentName,
							duration: 0,
							timestamp: getRelativeTime(),
							type: "passive-effect-mount",
							warning: null
						};
						if (supportsUserTimingV3) markAndClear(`--component-passive-effect-mount-start-${componentName}`);
					}
					function markComponentPassiveEffectMountStopped() {
						if (!isProfiling) return;
						if (currentReactComponentMeasure) {
							if (currentTimelineData) currentTimelineData.componentMeasures.push(currentReactComponentMeasure);
							currentReactComponentMeasure.duration = getRelativeTime() - currentReactComponentMeasure.timestamp;
							currentReactComponentMeasure = null;
						}
						if (supportsUserTimingV3) markAndClear("--component-passive-effect-mount-stop");
					}
					function markComponentPassiveEffectUnmountStarted(fiber) {
						if (!isProfiling) return;
						const componentName = getDisplayNameForFiber(fiber) || "Unknown";
						currentReactComponentMeasure = {
							componentName,
							duration: 0,
							timestamp: getRelativeTime(),
							type: "passive-effect-unmount",
							warning: null
						};
						if (supportsUserTimingV3) markAndClear(`--component-passive-effect-unmount-start-${componentName}`);
					}
					function markComponentPassiveEffectUnmountStopped() {
						if (!isProfiling) return;
						if (currentReactComponentMeasure) {
							if (currentTimelineData) currentTimelineData.componentMeasures.push(currentReactComponentMeasure);
							currentReactComponentMeasure.duration = getRelativeTime() - currentReactComponentMeasure.timestamp;
							currentReactComponentMeasure = null;
						}
						if (supportsUserTimingV3) markAndClear("--component-passive-effect-unmount-stop");
					}
					function markComponentErrored(fiber, thrownValue, lanes) {
						if (!isProfiling) return;
						const componentName = getDisplayNameForFiber(fiber) || "Unknown";
						const phase = fiber.alternate === null ? "mount" : "update";
						let message = "";
						if (thrownValue !== null && typeof thrownValue === "object" && typeof thrownValue.message === "string") message = thrownValue.message;
						else if (typeof thrownValue === "string") message = thrownValue;
						if (currentTimelineData) currentTimelineData.thrownErrors.push({
							componentName,
							message,
							phase,
							timestamp: getRelativeTime(),
							type: "thrown-error"
						});
						if (supportsUserTimingV3) markAndClear(`--error-${componentName}-${phase}-${message}`);
					}
					const wakeableIDs = new (typeof WeakMap === "function" ? WeakMap : Map)();
					let wakeableID = 0;
					function getWakeableID(wakeable) {
						if (!wakeableIDs.has(wakeable)) wakeableIDs.set(wakeable, wakeableID++);
						return wakeableIDs.get(wakeable);
					}
					function markComponentSuspended(fiber, wakeable, lanes) {
						if (!isProfiling) return;
						const eventType = wakeableIDs.has(wakeable) ? "resuspend" : "suspend";
						const id = getWakeableID(wakeable);
						const componentName = getDisplayNameForFiber(fiber) || "Unknown";
						const phase = fiber.alternate === null ? "mount" : "update";
						const displayName = wakeable.displayName || "";
						let suspenseEvent = null;
						suspenseEvent = {
							componentName,
							depth: 0,
							duration: 0,
							id: `${id}`,
							phase,
							promiseName: displayName,
							resolution: "unresolved",
							timestamp: getRelativeTime(),
							type: "suspense",
							warning: null
						};
						if (currentTimelineData) currentTimelineData.suspenseEvents.push(suspenseEvent);
						if (supportsUserTimingV3) {
							markAndClear(`--suspense-${eventType}-${id}-${componentName}-${phase}-${lanes}-${displayName}`);
							wakeable.then(() => {
								if (suspenseEvent) {
									suspenseEvent.duration = getRelativeTime() - suspenseEvent.timestamp;
									suspenseEvent.resolution = "resolved";
								}
								if (supportsUserTimingV3) markAndClear(`--suspense-resolved-${id}-${componentName}`);
							}, () => {
								if (suspenseEvent) {
									suspenseEvent.duration = getRelativeTime() - suspenseEvent.timestamp;
									suspenseEvent.resolution = "rejected";
								}
								if (supportsUserTimingV3) markAndClear(`--suspense-rejected-${id}-${componentName}`);
							});
						}
					}
					function markLayoutEffectsStarted(lanes) {
						if (!isProfiling) return;
						recordReactMeasureStarted("layout-effects", lanes);
						if (supportsUserTimingV3) markAndClear(`--layout-effects-start-${lanes}`);
					}
					function markLayoutEffectsStopped() {
						if (!isProfiling) return;
						recordReactMeasureCompleted("layout-effects");
						if (supportsUserTimingV3) markAndClear("--layout-effects-stop");
					}
					function markPassiveEffectsStarted(lanes) {
						if (!isProfiling) return;
						recordReactMeasureStarted("passive-effects", lanes);
						if (supportsUserTimingV3) markAndClear(`--passive-effects-start-${lanes}`);
					}
					function markPassiveEffectsStopped() {
						if (!isProfiling) return;
						recordReactMeasureCompleted("passive-effects");
						if (supportsUserTimingV3) markAndClear("--passive-effects-stop");
					}
					function markRenderStarted(lanes) {
						if (!isProfiling) return;
						if (nextRenderShouldStartNewBatch) {
							nextRenderShouldStartNewBatch = false;
							currentBatchUID++;
						}
						if (currentReactMeasuresStack.length === 0 || currentReactMeasuresStack[currentReactMeasuresStack.length - 1].type !== "render-idle") recordReactMeasureStarted("render-idle", lanes);
						recordReactMeasureStarted("render", lanes);
						if (supportsUserTimingV3) markAndClear(`--render-start-${lanes}`);
					}
					function markRenderYielded() {
						if (!isProfiling) return;
						recordReactMeasureCompleted("render");
						if (supportsUserTimingV3) markAndClear("--render-yield");
					}
					function markRenderStopped() {
						if (!isProfiling) return;
						recordReactMeasureCompleted("render");
						if (supportsUserTimingV3) markAndClear("--render-stop");
					}
					function markRenderScheduled(lane) {
						if (!isProfiling) return;
						if (currentTimelineData) currentTimelineData.schedulingEvents.push({
							lanes: laneToLanesArray(lane),
							timestamp: getRelativeTime(),
							type: "schedule-render",
							warning: null
						});
						if (supportsUserTimingV3) markAndClear(`--schedule-render-${lane}`);
					}
					function markForceUpdateScheduled(fiber, lane) {
						if (!isProfiling) return;
						const componentName = getDisplayNameForFiber(fiber) || "Unknown";
						if (currentTimelineData) currentTimelineData.schedulingEvents.push({
							componentName,
							lanes: laneToLanesArray(lane),
							timestamp: getRelativeTime(),
							type: "schedule-force-update",
							warning: null
						});
						if (supportsUserTimingV3) markAndClear(`--schedule-forced-update-${lane}-${componentName}`);
					}
					function getParentFibers(fiber) {
						const parents = [];
						let parent = fiber;
						while (parent !== null) {
							parents.push(parent);
							parent = parent.return;
						}
						return parents;
					}
					function markStateUpdateScheduled(fiber, lane) {
						if (!isProfiling) return;
						const componentName = getDisplayNameForFiber(fiber) || "Unknown";
						if (currentTimelineData) {
							const event = {
								componentName,
								lanes: laneToLanesArray(lane),
								timestamp: getRelativeTime(),
								type: "schedule-state-update",
								warning: null
							};
							currentFiberStacks.set(event, getParentFibers(fiber));
							currentTimelineData.schedulingEvents.push(event);
						}
						if (supportsUserTimingV3) markAndClear(`--schedule-state-update-${lane}-${componentName}`);
					}
					function toggleProfilingStatus(value, recordTimeline = false) {
						if (isProfiling !== value) {
							isProfiling = value;
							if (isProfiling) {
								const internalModuleSourceToRanges = /* @__PURE__ */ new Map();
								if (supportsUserTimingV3) {
									const ranges = getInternalModuleRanges();
									if (ranges) for (let i = 0; i < ranges.length; i++) {
										const range = ranges[i];
										if (shared_isArray(range) && range.length === 2) {
											const [startStackFrame, stopStackFrame] = ranges[i];
											markAndClear(`--react-internal-module-start-${startStackFrame}`);
											markAndClear(`--react-internal-module-stop-${stopStackFrame}`);
										}
									}
								}
								const laneToReactMeasureMap = /* @__PURE__ */ new Map();
								let lane = 1;
								for (let index = 0; index < REACT_TOTAL_NUM_LANES; index++) {
									laneToReactMeasureMap.set(lane, []);
									lane *= 2;
								}
								currentBatchUID = 0;
								currentReactComponentMeasure = null;
								currentReactMeasuresStack = [];
								currentFiberStacks = /* @__PURE__ */ new Map();
								if (recordTimeline) currentTimelineData = {
									internalModuleSourceToRanges,
									laneToLabelMap: laneToLabelMap || /* @__PURE__ */ new Map(),
									reactVersion,
									componentMeasures: [],
									schedulingEvents: [],
									suspenseEvents: [],
									thrownErrors: [],
									batchUIDToMeasuresMap: /* @__PURE__ */ new Map(),
									duration: 0,
									laneToReactMeasureMap,
									startTime: 0,
									flamechart: [],
									nativeEvents: [],
									networkMeasures: [],
									otherUserTimingMarks: [],
									snapshots: [],
									snapshotHeight: 0
								};
								nextRenderShouldStartNewBatch = true;
							} else {
								if (currentTimelineData !== null) currentTimelineData.schedulingEvents.forEach((event) => {
									if (event.type === "schedule-state-update") {
										const fiberStack = currentFiberStacks.get(event);
										if (fiberStack && currentDispatcherRef != null) event.componentStack = fiberStack.reduce((trace, fiber) => {
											return trace + describeFiber(workTagMap, fiber, currentDispatcherRef);
										}, "");
									}
								});
								currentFiberStacks.clear();
							}
						}
					}
					return {
						getTimelineData,
						profilingHooks: {
							markCommitStarted,
							markCommitStopped,
							markComponentRenderStarted,
							markComponentRenderStopped,
							markComponentPassiveEffectMountStarted,
							markComponentPassiveEffectMountStopped,
							markComponentPassiveEffectUnmountStarted,
							markComponentPassiveEffectUnmountStopped,
							markComponentLayoutEffectMountStarted,
							markComponentLayoutEffectMountStopped,
							markComponentLayoutEffectUnmountStarted,
							markComponentLayoutEffectUnmountStopped,
							markComponentErrored,
							markComponentSuspended,
							markLayoutEffectsStarted,
							markLayoutEffectsStopped,
							markPassiveEffectsStarted,
							markPassiveEffectsStopped,
							markRenderStarted,
							markRenderYielded,
							markRenderStopped,
							markRenderScheduled,
							markForceUpdateScheduled,
							markStateUpdateScheduled
						},
						toggleProfilingStatus
					};
				}
				const renderer_toString = Object.prototype.toString;
				function renderer_isError(object) {
					return renderer_toString.call(object) === "[object Error]";
				}
				const FIBER_INSTANCE = 0;
				const VIRTUAL_INSTANCE = 1;
				const FILTERED_FIBER_INSTANCE = 2;
				function createFiberInstance(fiber) {
					return {
						kind: FIBER_INSTANCE,
						id: getUID(),
						parent: null,
						firstChild: null,
						nextSibling: null,
						source: null,
						logCount: 0,
						treeBaseDuration: 0,
						suspendedBy: null,
						suspenseNode: null,
						data: fiber
					};
				}
				function createFilteredFiberInstance(fiber) {
					return {
						kind: FILTERED_FIBER_INSTANCE,
						id: 0,
						parent: null,
						firstChild: null,
						nextSibling: null,
						source: null,
						logCount: 0,
						treeBaseDuration: 0,
						suspendedBy: null,
						suspenseNode: null,
						data: fiber
					};
				}
				function createVirtualInstance(debugEntry) {
					return {
						kind: VIRTUAL_INSTANCE,
						id: getUID(),
						parent: null,
						firstChild: null,
						nextSibling: null,
						source: null,
						logCount: 0,
						treeBaseDuration: 0,
						suspendedBy: null,
						suspenseNode: null,
						data: debugEntry
					};
				}
				const NoUpdate = 0;
				const ShouldResetChildren = 1;
				const ShouldResetSuspenseChildren = 2;
				const ShouldResetParentSuspenseChildren = 4;
				function createSuspenseNode(instance) {
					return instance.suspenseNode = {
						instance,
						parent: null,
						firstChild: null,
						nextSibling: null,
						rects: null,
						suspendedBy: /* @__PURE__ */ new Map(),
						environments: /* @__PURE__ */ new Map(),
						hasUniqueSuspenders: false,
						hasUnknownSuspenders: false
					};
				}
				function getDispatcherRef(renderer) {
					if (renderer.currentDispatcherRef === void 0) return;
					const injectedRef = renderer.currentDispatcherRef;
					if (typeof injectedRef.H === "undefined" && typeof injectedRef.current !== "undefined") return {
						get H() {
							return injectedRef.current;
						},
						set H(value) {
							injectedRef.current = value;
						}
					};
					return injectedRef;
				}
				function getFiberFlags(fiber) {
					return fiber.flags !== void 0 ? fiber.flags : fiber.effectTag;
				}
				const renderer_getCurrentTime = typeof performance === "object" && typeof performance.now === "function" ? () => performance.now() : () => Date.now();
				function getInternalReactConstants(version) {
					let ReactPriorityLevels = {
						ImmediatePriority: 99,
						UserBlockingPriority: 98,
						NormalPriority: 97,
						LowPriority: 96,
						IdlePriority: 95,
						NoPriority: 90
					};
					if (gt(version, "17.0.2")) ReactPriorityLevels = {
						ImmediatePriority: 1,
						UserBlockingPriority: 2,
						NormalPriority: 3,
						LowPriority: 4,
						IdlePriority: 5,
						NoPriority: 0
					};
					let StrictModeBits = 0;
					if (gte(version, "18.0.0-alpha")) StrictModeBits = 24;
					else if (gte(version, "16.9.0")) StrictModeBits = 1;
					else if (gte(version, "16.3.0")) StrictModeBits = 2;
					const SuspenseyImagesMode = 32;
					let ReactTypeOfWork = null;
					if (gt(version, "17.0.1")) ReactTypeOfWork = {
						CacheComponent: 24,
						ClassComponent: 1,
						ContextConsumer: 9,
						ContextProvider: 10,
						CoroutineComponent: -1,
						CoroutineHandlerPhase: -1,
						DehydratedSuspenseComponent: 18,
						ForwardRef: 11,
						Fragment: 7,
						FunctionComponent: 0,
						HostComponent: 5,
						HostPortal: 4,
						HostRoot: 3,
						HostHoistable: 26,
						HostSingleton: 27,
						HostText: 6,
						IncompleteClassComponent: 17,
						IncompleteFunctionComponent: 28,
						IndeterminateComponent: 2,
						LazyComponent: 16,
						LegacyHiddenComponent: 23,
						MemoComponent: 14,
						Mode: 8,
						OffscreenComponent: 22,
						Profiler: 12,
						ScopeComponent: 21,
						SimpleMemoComponent: 15,
						SuspenseComponent: 13,
						SuspenseListComponent: 19,
						TracingMarkerComponent: 25,
						YieldComponent: -1,
						Throw: 29,
						ViewTransitionComponent: 30,
						ActivityComponent: 31
					};
					else if (gte(version, "17.0.0-alpha")) ReactTypeOfWork = {
						CacheComponent: -1,
						ClassComponent: 1,
						ContextConsumer: 9,
						ContextProvider: 10,
						CoroutineComponent: -1,
						CoroutineHandlerPhase: -1,
						DehydratedSuspenseComponent: 18,
						ForwardRef: 11,
						Fragment: 7,
						FunctionComponent: 0,
						HostComponent: 5,
						HostPortal: 4,
						HostRoot: 3,
						HostHoistable: -1,
						HostSingleton: -1,
						HostText: 6,
						IncompleteClassComponent: 17,
						IncompleteFunctionComponent: -1,
						IndeterminateComponent: 2,
						LazyComponent: 16,
						LegacyHiddenComponent: 24,
						MemoComponent: 14,
						Mode: 8,
						OffscreenComponent: 23,
						Profiler: 12,
						ScopeComponent: 21,
						SimpleMemoComponent: 15,
						SuspenseComponent: 13,
						SuspenseListComponent: 19,
						TracingMarkerComponent: -1,
						YieldComponent: -1,
						Throw: -1,
						ViewTransitionComponent: -1,
						ActivityComponent: -1
					};
					else if (gte(version, "16.6.0-beta.0")) ReactTypeOfWork = {
						CacheComponent: -1,
						ClassComponent: 1,
						ContextConsumer: 9,
						ContextProvider: 10,
						CoroutineComponent: -1,
						CoroutineHandlerPhase: -1,
						DehydratedSuspenseComponent: 18,
						ForwardRef: 11,
						Fragment: 7,
						FunctionComponent: 0,
						HostComponent: 5,
						HostPortal: 4,
						HostRoot: 3,
						HostHoistable: -1,
						HostSingleton: -1,
						HostText: 6,
						IncompleteClassComponent: 17,
						IncompleteFunctionComponent: -1,
						IndeterminateComponent: 2,
						LazyComponent: 16,
						LegacyHiddenComponent: -1,
						MemoComponent: 14,
						Mode: 8,
						OffscreenComponent: -1,
						Profiler: 12,
						ScopeComponent: -1,
						SimpleMemoComponent: 15,
						SuspenseComponent: 13,
						SuspenseListComponent: 19,
						TracingMarkerComponent: -1,
						YieldComponent: -1,
						Throw: -1,
						ViewTransitionComponent: -1,
						ActivityComponent: -1
					};
					else if (gte(version, "16.4.3-alpha")) ReactTypeOfWork = {
						CacheComponent: -1,
						ClassComponent: 2,
						ContextConsumer: 11,
						ContextProvider: 12,
						CoroutineComponent: -1,
						CoroutineHandlerPhase: -1,
						DehydratedSuspenseComponent: -1,
						ForwardRef: 13,
						Fragment: 9,
						FunctionComponent: 0,
						HostComponent: 7,
						HostPortal: 6,
						HostRoot: 5,
						HostHoistable: -1,
						HostSingleton: -1,
						HostText: 8,
						IncompleteClassComponent: -1,
						IncompleteFunctionComponent: -1,
						IndeterminateComponent: 4,
						LazyComponent: -1,
						LegacyHiddenComponent: -1,
						MemoComponent: -1,
						Mode: 10,
						OffscreenComponent: -1,
						Profiler: 15,
						ScopeComponent: -1,
						SimpleMemoComponent: -1,
						SuspenseComponent: 16,
						SuspenseListComponent: -1,
						TracingMarkerComponent: -1,
						YieldComponent: -1,
						Throw: -1,
						ViewTransitionComponent: -1,
						ActivityComponent: -1
					};
					else ReactTypeOfWork = {
						CacheComponent: -1,
						ClassComponent: 2,
						ContextConsumer: 12,
						ContextProvider: 13,
						CoroutineComponent: 7,
						CoroutineHandlerPhase: 8,
						DehydratedSuspenseComponent: -1,
						ForwardRef: 14,
						Fragment: 10,
						FunctionComponent: 1,
						HostComponent: 5,
						HostPortal: 4,
						HostRoot: 3,
						HostHoistable: -1,
						HostSingleton: -1,
						HostText: 6,
						IncompleteClassComponent: -1,
						IncompleteFunctionComponent: -1,
						IndeterminateComponent: 0,
						LazyComponent: -1,
						LegacyHiddenComponent: -1,
						MemoComponent: -1,
						Mode: 11,
						OffscreenComponent: -1,
						Profiler: 15,
						ScopeComponent: -1,
						SimpleMemoComponent: -1,
						SuspenseComponent: 16,
						SuspenseListComponent: -1,
						TracingMarkerComponent: -1,
						YieldComponent: 9,
						Throw: -1,
						ViewTransitionComponent: -1,
						ActivityComponent: -1
					};
					function getTypeSymbol(type) {
						const symbolOrNumber = typeof type === "object" && type !== null ? type.$$typeof : type;
						return typeof symbolOrNumber === "symbol" ? symbolOrNumber.toString() : symbolOrNumber;
					}
					const { CacheComponent, ClassComponent, IncompleteClassComponent, IncompleteFunctionComponent, FunctionComponent, IndeterminateComponent, ForwardRef, HostRoot, HostHoistable, HostSingleton, HostComponent, HostPortal, HostText, Fragment, LazyComponent, LegacyHiddenComponent, MemoComponent, OffscreenComponent, Profiler, ScopeComponent, SimpleMemoComponent, SuspenseComponent, SuspenseListComponent, TracingMarkerComponent, Throw, ViewTransitionComponent, ActivityComponent } = ReactTypeOfWork;
					function resolveFiberType(type) {
						switch (getTypeSymbol(type)) {
							case MEMO_NUMBER:
							case MEMO_SYMBOL_STRING: return resolveFiberType(type.type);
							case FORWARD_REF_NUMBER:
							case FORWARD_REF_SYMBOL_STRING: return type.render;
							default: return type;
						}
					}
					function getDisplayNameForFiber(fiber, shouldSkipForgetCheck = false) {
						const { elementType, type, tag } = fiber;
						let resolvedType = type;
						if (typeof type === "object" && type !== null) resolvedType = resolveFiberType(type);
						let resolvedContext = null;
						if (!shouldSkipForgetCheck && (fiber.updateQueue?.memoCache != null || Array.isArray(fiber.memoizedState?.memoizedState) && fiber.memoizedState.memoizedState[0]?.[ReactSymbols_REACT_MEMO_CACHE_SENTINEL] || fiber.memoizedState?.memoizedState?.[ReactSymbols_REACT_MEMO_CACHE_SENTINEL])) {
							const displayNameWithoutForgetWrapper = getDisplayNameForFiber(fiber, true);
							if (displayNameWithoutForgetWrapper == null) return null;
							return `Forget(${displayNameWithoutForgetWrapper})`;
						}
						switch (tag) {
							case ActivityComponent: return "Activity";
							case CacheComponent: return "Cache";
							case ClassComponent:
							case IncompleteClassComponent:
							case IncompleteFunctionComponent:
							case FunctionComponent:
							case IndeterminateComponent: return getDisplayName(resolvedType);
							case ForwardRef: return getWrappedDisplayName(elementType, resolvedType, "ForwardRef", "Anonymous");
							case HostRoot:
								const fiberRoot = fiber.stateNode;
								if (fiberRoot != null && fiberRoot._debugRootType !== null) return fiberRoot._debugRootType;
								return null;
							case HostComponent:
							case HostSingleton:
							case HostHoistable: return type;
							case HostPortal:
							case HostText: return null;
							case Fragment: return "Fragment";
							case LazyComponent: return "Lazy";
							case MemoComponent:
							case SimpleMemoComponent: return getWrappedDisplayName(elementType, resolvedType, "Memo", "Anonymous");
							case SuspenseComponent: return "Suspense";
							case LegacyHiddenComponent: return "LegacyHidden";
							case OffscreenComponent: return "Offscreen";
							case ScopeComponent: return "Scope";
							case SuspenseListComponent: return "SuspenseList";
							case Profiler: return "Profiler";
							case TracingMarkerComponent: return "TracingMarker";
							case ViewTransitionComponent: return "ViewTransition";
							case Throw: return "Error";
							default: switch (getTypeSymbol(type)) {
								case CONCURRENT_MODE_NUMBER:
								case CONCURRENT_MODE_SYMBOL_STRING:
								case DEPRECATED_ASYNC_MODE_SYMBOL_STRING: return null;
								case PROVIDER_NUMBER:
								case PROVIDER_SYMBOL_STRING:
									resolvedContext = fiber.type._context || fiber.type.context;
									return `${resolvedContext.displayName || "Context"}.Provider`;
								case CONTEXT_NUMBER:
								case CONTEXT_SYMBOL_STRING:
								case SERVER_CONTEXT_SYMBOL_STRING:
									if (fiber.type._context === void 0 && fiber.type.Provider === fiber.type) {
										resolvedContext = fiber.type;
										return `${resolvedContext.displayName || "Context"}.Provider`;
									}
									resolvedContext = fiber.type._context || fiber.type;
									return `${resolvedContext.displayName || "Context"}.Consumer`;
								case CONSUMER_SYMBOL_STRING:
									resolvedContext = fiber.type._context;
									return `${resolvedContext.displayName || "Context"}.Consumer`;
								case STRICT_MODE_NUMBER:
								case STRICT_MODE_SYMBOL_STRING: return null;
								case PROFILER_NUMBER:
								case PROFILER_SYMBOL_STRING: return `Profiler(${fiber.memoizedProps.id})`;
								case SCOPE_NUMBER:
								case SCOPE_SYMBOL_STRING: return "Scope";
								default: return null;
							}
						}
					}
					return {
						getDisplayNameForFiber,
						getTypeSymbol,
						ReactPriorityLevels,
						ReactTypeOfWork,
						StrictModeBits,
						SuspenseyImagesMode
					};
				}
				const knownEnvironmentNames = /* @__PURE__ */ new Set();
				const rootToFiberInstanceMap = /* @__PURE__ */ new Map();
				const idToDevToolsInstanceMap = /* @__PURE__ */ new Map();
				const idToSuspenseNodeMap = /* @__PURE__ */ new Map();
				const publicInstanceToDevToolsInstanceMap = /* @__PURE__ */ new Map();
				const hostResourceToDevToolsInstanceMap = /* @__PURE__ */ new Map();
				function getPublicInstance(instance) {
					if (typeof instance === "object" && instance !== null) {
						if (typeof instance.canonical === "object" && instance.canonical !== null) {
							if (typeof instance.canonical.publicInstance === "object" && instance.canonical.publicInstance !== null) return instance.canonical.publicInstance;
						}
						if (typeof instance._nativeTag === "number") return instance._nativeTag;
					}
					return instance;
				}
				function getNativeTag(instance) {
					if (typeof instance !== "object" || instance === null) return null;
					if (instance.canonical != null && typeof instance.canonical.nativeTag === "number") return instance.canonical.nativeTag;
					if (typeof instance._nativeTag === "number") return instance._nativeTag;
					return null;
				}
				function aquireHostInstance(nearestInstance, hostInstance) {
					const publicInstance = getPublicInstance(hostInstance);
					publicInstanceToDevToolsInstanceMap.set(publicInstance, nearestInstance);
				}
				function releaseHostInstance(nearestInstance, hostInstance) {
					const publicInstance = getPublicInstance(hostInstance);
					if (publicInstanceToDevToolsInstanceMap.get(publicInstance) === nearestInstance) publicInstanceToDevToolsInstanceMap.delete(publicInstance);
				}
				function aquireHostResource(nearestInstance, resource) {
					const hostInstance = resource && resource.instance;
					if (hostInstance) {
						const publicInstance = getPublicInstance(hostInstance);
						let resourceInstances = hostResourceToDevToolsInstanceMap.get(publicInstance);
						if (resourceInstances === void 0) {
							resourceInstances = /* @__PURE__ */ new Set();
							hostResourceToDevToolsInstanceMap.set(publicInstance, resourceInstances);
							publicInstanceToDevToolsInstanceMap.set(publicInstance, nearestInstance);
						}
						resourceInstances.add(nearestInstance);
					}
				}
				function releaseHostResource(nearestInstance, resource) {
					const hostInstance = resource && resource.instance;
					if (hostInstance) {
						const publicInstance = getPublicInstance(hostInstance);
						const resourceInstances = hostResourceToDevToolsInstanceMap.get(publicInstance);
						if (resourceInstances !== void 0) {
							resourceInstances.delete(nearestInstance);
							if (resourceInstances.size === 0) {
								hostResourceToDevToolsInstanceMap.delete(publicInstance);
								publicInstanceToDevToolsInstanceMap.delete(publicInstance);
							} else if (publicInstanceToDevToolsInstanceMap.get(publicInstance) === nearestInstance) for (const firstInstance of resourceInstances) {
								publicInstanceToDevToolsInstanceMap.set(firstInstance, nearestInstance);
								break;
							}
						}
					}
				}
				function renderer_attach(hook, rendererID, renderer, global, shouldStartProfilingNow, profilingSettings) {
					const version = renderer.reconcilerVersion || renderer.version;
					const { getDisplayNameForFiber, getTypeSymbol, ReactPriorityLevels, ReactTypeOfWork, StrictModeBits, SuspenseyImagesMode } = getInternalReactConstants(version);
					const { ActivityComponent, ClassComponent, ContextConsumer, DehydratedSuspenseComponent, ForwardRef, Fragment, FunctionComponent, HostRoot, HostHoistable, HostSingleton, HostPortal, HostComponent, HostText, IncompleteClassComponent, IncompleteFunctionComponent, IndeterminateComponent, LegacyHiddenComponent, MemoComponent, OffscreenComponent, SimpleMemoComponent, SuspenseComponent, SuspenseListComponent, TracingMarkerComponent, Throw, ViewTransitionComponent } = ReactTypeOfWork;
					const { ImmediatePriority, UserBlockingPriority, NormalPriority, LowPriority, IdlePriority, NoPriority } = ReactPriorityLevels;
					const { getLaneLabelMap, injectProfilingHooks, overrideHookState, overrideHookStateDeletePath, overrideHookStateRenamePath, overrideProps, overridePropsDeletePath, overridePropsRenamePath, scheduleRefresh, setErrorHandler, setSuspenseHandler, scheduleUpdate, scheduleRetry, getCurrentFiber } = renderer;
					const supportsTogglingError = typeof setErrorHandler === "function" && typeof scheduleUpdate === "function";
					const supportsTogglingSuspense = typeof setSuspenseHandler === "function" && typeof scheduleUpdate === "function";
					const supportsPerformanceTracks = gte(version, "19.2.0");
					if (typeof scheduleRefresh === "function") renderer.scheduleRefresh = (...args) => {
						try {
							hook.emit("fastRefreshScheduled");
						} finally {
							return scheduleRefresh(...args);
						}
					};
					let getTimelineData = null;
					let toggleProfilingStatus = null;
					if (typeof injectProfilingHooks === "function") {
						const response = createProfilingHooks({
							getDisplayNameForFiber,
							getIsProfiling: () => isProfiling,
							getLaneLabelMap,
							currentDispatcherRef: getDispatcherRef(renderer),
							workTagMap: ReactTypeOfWork,
							reactVersion: version
						});
						injectProfilingHooks(response.profilingHooks);
						getTimelineData = response.getTimelineData;
						toggleProfilingStatus = response.toggleProfilingStatus;
					}
					const fiberToComponentLogsMap = /* @__PURE__ */ new WeakMap();
					let needsToFlushComponentLogs = false;
					function bruteForceFlushErrorsAndWarnings() {
						let hasChanges = false;
						for (const devtoolsInstance of idToDevToolsInstanceMap.values()) if (devtoolsInstance.kind === FIBER_INSTANCE) {
							const fiber = devtoolsInstance.data;
							if (recordConsoleLogs(devtoolsInstance, fiberToComponentLogsMap.get(fiber))) {
								hasChanges = true;
								updateMostRecentlyInspectedElementIfNecessary(devtoolsInstance.id);
							}
						}
						if (hasChanges) flushPendingEvents();
					}
					function clearErrorsAndWarnings() {
						for (const devtoolsInstance of idToDevToolsInstanceMap.values()) {
							if (devtoolsInstance.kind === FIBER_INSTANCE) {
								const fiber = devtoolsInstance.data;
								fiberToComponentLogsMap.delete(fiber);
								if (fiber.alternate) fiberToComponentLogsMap.delete(fiber.alternate);
							} else componentInfoToComponentLogsMap["delete"](devtoolsInstance.data);
							if (recordConsoleLogs(devtoolsInstance, void 0)) updateMostRecentlyInspectedElementIfNecessary(devtoolsInstance.id);
						}
						flushPendingEvents();
					}
					function clearConsoleLogsHelper(instanceID, type) {
						const devtoolsInstance = idToDevToolsInstanceMap.get(instanceID);
						if (devtoolsInstance !== void 0) {
							let componentLogsEntry;
							if (devtoolsInstance.kind === FIBER_INSTANCE) {
								const fiber = devtoolsInstance.data;
								componentLogsEntry = fiberToComponentLogsMap.get(fiber);
								if (componentLogsEntry === void 0 && fiber.alternate !== null) componentLogsEntry = fiberToComponentLogsMap.get(fiber.alternate);
							} else {
								const componentInfo = devtoolsInstance.data;
								componentLogsEntry = componentInfoToComponentLogsMap.get(componentInfo);
							}
							if (componentLogsEntry !== void 0) {
								if (type === "error") {
									componentLogsEntry.errors.clear();
									componentLogsEntry.errorsCount = 0;
								} else {
									componentLogsEntry.warnings.clear();
									componentLogsEntry.warningsCount = 0;
								}
								if (recordConsoleLogs(devtoolsInstance, componentLogsEntry)) {
									flushPendingEvents();
									updateMostRecentlyInspectedElementIfNecessary(devtoolsInstance.id);
								}
							}
						}
					}
					function clearErrorsForElementID(instanceID) {
						clearConsoleLogsHelper(instanceID, "error");
					}
					function clearWarningsForElementID(instanceID) {
						clearConsoleLogsHelper(instanceID, "warn");
					}
					function updateMostRecentlyInspectedElementIfNecessary(fiberID) {
						if (mostRecentlyInspectedElement !== null && mostRecentlyInspectedElement.id === fiberID) hasElementUpdatedSinceLastInspected = true;
					}
					function getComponentStack(topFrame) {
						if (getCurrentFiber == null) return null;
						const current = getCurrentFiber();
						if (current === null) return null;
						if (DevToolsFiberComponentStack_supportsConsoleTasks(current)) return null;
						const dispatcherRef = getDispatcherRef(renderer);
						if (dispatcherRef === void 0) return null;
						const enableOwnerStacks = supportsOwnerStacks(current);
						let componentStack = "";
						if (enableOwnerStacks) {
							const topStackFrames = formatOwnerStack(topFrame);
							if (topStackFrames) componentStack += "\n" + topStackFrames;
							componentStack += getOwnerStackByFiberInDev(ReactTypeOfWork, current, dispatcherRef);
						} else componentStack = getStackByFiberInDevAndProd(ReactTypeOfWork, current, dispatcherRef);
						return {
							enableOwnerStacks,
							componentStack
						};
					}
					function onErrorOrWarning(type, args) {
						if (getCurrentFiber == null) return;
						const fiber = getCurrentFiber();
						if (fiber === null) return;
						if (type === "error") {
							if (forceErrorForFibers.get(fiber) === true || fiber.alternate !== null && forceErrorForFibers.get(fiber.alternate) === true) return;
						}
						const message = formatConsoleArgumentsToSingleString(...args);
						let componentLogsEntry = fiberToComponentLogsMap.get(fiber);
						if (componentLogsEntry === void 0 && fiber.alternate !== null) {
							componentLogsEntry = fiberToComponentLogsMap.get(fiber.alternate);
							if (componentLogsEntry !== void 0) fiberToComponentLogsMap.set(fiber, componentLogsEntry);
						}
						if (componentLogsEntry === void 0) {
							componentLogsEntry = {
								errors: /* @__PURE__ */ new Map(),
								errorsCount: 0,
								warnings: /* @__PURE__ */ new Map(),
								warningsCount: 0
							};
							fiberToComponentLogsMap.set(fiber, componentLogsEntry);
						}
						const messageMap = type === "error" ? componentLogsEntry.errors : componentLogsEntry.warnings;
						const count = messageMap.get(message) || 0;
						messageMap.set(message, count + 1);
						if (type === "error") componentLogsEntry.errorsCount++;
						else componentLogsEntry.warningsCount++;
						needsToFlushComponentLogs = true;
					}
					const hideElementsWithDisplayNames = /* @__PURE__ */ new Set();
					const hideElementsWithPaths = /* @__PURE__ */ new Set();
					const hideElementsWithTypes = /* @__PURE__ */ new Set();
					const hideElementsWithEnvs = /* @__PURE__ */ new Set();
					let traceUpdatesEnabled = false;
					const traceUpdatesForNodes = /* @__PURE__ */ new Set();
					function applyComponentFilters(componentFilters) {
						hideElementsWithTypes.clear();
						hideElementsWithDisplayNames.clear();
						hideElementsWithPaths.clear();
						hideElementsWithEnvs.clear();
						componentFilters.forEach((componentFilter) => {
							if (!componentFilter.isEnabled) return;
							switch (componentFilter.type) {
								case ComponentFilterDisplayName:
									if (componentFilter.isValid && componentFilter.value !== "") hideElementsWithDisplayNames.add(new RegExp(componentFilter.value, "i"));
									break;
								case ComponentFilterElementType:
									hideElementsWithTypes.add(componentFilter.value);
									break;
								case ComponentFilterLocation:
									if (componentFilter.isValid && componentFilter.value !== "") hideElementsWithPaths.add(new RegExp(componentFilter.value, "i"));
									break;
								case ComponentFilterHOC:
									hideElementsWithDisplayNames.add(/* @__PURE__ */ new RegExp("\\("));
									break;
								case ComponentFilterEnvironmentName:
									hideElementsWithEnvs.add(componentFilter.value);
									break;
								default:
									console.warn(`Invalid component filter type "${componentFilter.type}"`);
									break;
							}
						});
					}
					if (window.__REACT_DEVTOOLS_COMPONENT_FILTERS__ != null) applyComponentFilters(filterOutLocationComponentFilters(window.__REACT_DEVTOOLS_COMPONENT_FILTERS__));
					else applyComponentFilters(getDefaultComponentFilters());
					function updateComponentFilters(componentFilters) {
						if (isProfiling) throw Error("Cannot modify filter preferences while profiling");
						hook.getFiberRoots(rendererID).forEach((root) => {
							const rootInstance = rootToFiberInstanceMap.get(root);
							if (rootInstance === void 0) throw new Error("Expected the root instance to already exist when applying filters");
							currentRoot = rootInstance;
							unmountInstanceRecursively(rootInstance);
							rootToFiberInstanceMap.delete(root);
							flushPendingEvents();
							currentRoot = null;
						});
						applyComponentFilters(componentFilters);
						rootDisplayNameCounter.clear();
						hook.getFiberRoots(rendererID).forEach((root) => {
							const current = root.current;
							const newRoot = createFiberInstance(current);
							rootToFiberInstanceMap.set(root, newRoot);
							idToDevToolsInstanceMap.set(newRoot.id, newRoot);
							if (trackedPath !== null) mightBeOnTrackedPath = true;
							currentRoot = newRoot;
							setRootPseudoKey(currentRoot.id, root.current);
							mountFiberRecursively(root.current, false);
							flushPendingEvents();
							currentRoot = null;
						});
						flushPendingEvents();
						needsToFlushComponentLogs = false;
					}
					function getEnvironmentNames() {
						return Array.from(knownEnvironmentNames);
					}
					function isFiberHydrated(fiber) {
						if (OffscreenComponent === -1) throw new Error("not implemented for legacy suspense");
						switch (fiber.tag) {
							case HostRoot: return !fiber.memoizedState.isDehydrated;
							case SuspenseComponent:
								const suspenseState = fiber.memoizedState;
								return suspenseState === null || suspenseState.dehydrated === null;
							default: throw new Error("not implemented for work tag " + fiber.tag);
						}
					}
					function shouldFilterVirtual(data, secondaryEnv) {
						if (hideElementsWithTypes.has(types_ElementTypeFunction)) return true;
						if (hideElementsWithDisplayNames.size > 0) {
							const displayName = data.name;
							if (displayName != null) {
								for (const displayNameRegExp of hideElementsWithDisplayNames) if (displayNameRegExp.test(displayName)) return true;
							}
						}
						if ((data.env == null || hideElementsWithEnvs.has(data.env)) && (secondaryEnv === null || hideElementsWithEnvs.has(secondaryEnv))) return true;
						return false;
					}
					function shouldFilterFiber(fiber) {
						const { tag, type, key } = fiber;
						switch (tag) {
							case DehydratedSuspenseComponent: return true;
							case HostPortal:
							case HostText:
							case LegacyHiddenComponent:
							case OffscreenComponent:
							case Throw: return true;
							case HostRoot: return false;
							case Fragment: return key === null;
							default: switch (getTypeSymbol(type)) {
								case CONCURRENT_MODE_NUMBER:
								case CONCURRENT_MODE_SYMBOL_STRING:
								case DEPRECATED_ASYNC_MODE_SYMBOL_STRING:
								case STRICT_MODE_NUMBER:
								case STRICT_MODE_SYMBOL_STRING: return true;
								default: break;
							}
						}
						const elementType = getElementTypeForFiber(fiber);
						if (hideElementsWithTypes.has(elementType)) return true;
						if (hideElementsWithDisplayNames.size > 0) {
							const displayName = getDisplayNameForFiber(fiber);
							if (displayName != null) {
								for (const displayNameRegExp of hideElementsWithDisplayNames) if (displayNameRegExp.test(displayName)) return true;
							}
						}
						if (hideElementsWithEnvs.has("Client")) switch (tag) {
							case ClassComponent:
							case IncompleteClassComponent:
							case IncompleteFunctionComponent:
							case FunctionComponent:
							case IndeterminateComponent:
							case ForwardRef:
							case MemoComponent:
							case SimpleMemoComponent: return true;
						}
						return false;
					}
					function getElementTypeForFiber(fiber) {
						const { type, tag } = fiber;
						switch (tag) {
							case ActivityComponent: return ElementTypeActivity;
							case ClassComponent:
							case IncompleteClassComponent: return types_ElementTypeClass;
							case IncompleteFunctionComponent:
							case FunctionComponent:
							case IndeterminateComponent: return types_ElementTypeFunction;
							case ForwardRef: return types_ElementTypeForwardRef;
							case HostRoot: return ElementTypeRoot;
							case HostComponent:
							case HostHoistable:
							case HostSingleton: return ElementTypeHostComponent;
							case HostPortal:
							case HostText:
							case Fragment: return ElementTypeOtherOrUnknown;
							case MemoComponent:
							case SimpleMemoComponent: return types_ElementTypeMemo;
							case SuspenseComponent: return ElementTypeSuspense;
							case SuspenseListComponent: return ElementTypeSuspenseList;
							case TracingMarkerComponent: return ElementTypeTracingMarker;
							case ViewTransitionComponent: return ElementTypeViewTransition;
							default: switch (getTypeSymbol(type)) {
								case CONCURRENT_MODE_NUMBER:
								case CONCURRENT_MODE_SYMBOL_STRING:
								case DEPRECATED_ASYNC_MODE_SYMBOL_STRING: return ElementTypeOtherOrUnknown;
								case PROVIDER_NUMBER:
								case PROVIDER_SYMBOL_STRING: return ElementTypeContext;
								case CONTEXT_NUMBER:
								case CONTEXT_SYMBOL_STRING: return ElementTypeContext;
								case STRICT_MODE_NUMBER:
								case STRICT_MODE_SYMBOL_STRING: return ElementTypeOtherOrUnknown;
								case PROFILER_NUMBER:
								case PROFILER_SYMBOL_STRING: return ElementTypeProfiler;
								default: return ElementTypeOtherOrUnknown;
							}
						}
					}
					let currentRoot = null;
					function untrackFiber(nearestInstance, fiber) {
						if (forceErrorForFibers.size > 0) {
							forceErrorForFibers.delete(fiber);
							if (fiber.alternate) forceErrorForFibers.delete(fiber.alternate);
							if (forceErrorForFibers.size === 0 && setErrorHandler != null) setErrorHandler(shouldErrorFiberAlwaysNull);
						}
						if (forceFallbackForFibers.size > 0) {
							forceFallbackForFibers.delete(fiber);
							if (fiber.alternate) forceFallbackForFibers.delete(fiber.alternate);
							if (forceFallbackForFibers.size === 0 && setSuspenseHandler != null) setSuspenseHandler(shouldSuspendFiberAlwaysFalse);
						}
						if (fiber.tag === HostHoistable) releaseHostResource(nearestInstance, fiber.memoizedState);
						else if (fiber.tag === HostComponent || fiber.tag === HostText || fiber.tag === HostSingleton) releaseHostInstance(nearestInstance, fiber.stateNode);
						for (let child = fiber.child; child !== null; child = child.sibling) if (shouldFilterFiber(child)) untrackFiber(nearestInstance, child);
					}
					function getChangeDescription(prevFiber, nextFiber) {
						switch (nextFiber.tag) {
							case ClassComponent: if (prevFiber === null) return {
								context: null,
								didHooksChange: false,
								isFirstMount: true,
								props: null,
								state: null
							};
							else return {
								context: getContextChanged(prevFiber, nextFiber),
								didHooksChange: false,
								isFirstMount: false,
								props: getChangedKeys(prevFiber.memoizedProps, nextFiber.memoizedProps),
								state: getChangedKeys(prevFiber.memoizedState, nextFiber.memoizedState)
							};
							case IncompleteFunctionComponent:
							case FunctionComponent:
							case IndeterminateComponent:
							case ForwardRef:
							case MemoComponent:
							case SimpleMemoComponent: if (prevFiber === null) return {
								context: null,
								didHooksChange: false,
								isFirstMount: true,
								props: null,
								state: null
							};
							else {
								const indices = getChangedHooksIndices(prevFiber.memoizedState, nextFiber.memoizedState);
								return {
									context: getContextChanged(prevFiber, nextFiber),
									didHooksChange: indices !== null && indices.length > 0,
									isFirstMount: false,
									props: getChangedKeys(prevFiber.memoizedProps, nextFiber.memoizedProps),
									state: null,
									hooks: indices
								};
							}
							default: return null;
						}
					}
					function getContextChanged(prevFiber, nextFiber) {
						let prevContext = prevFiber.dependencies && prevFiber.dependencies.firstContext;
						let nextContext = nextFiber.dependencies && nextFiber.dependencies.firstContext;
						while (prevContext && nextContext) {
							if (prevContext.context !== nextContext.context) return false;
							if (!shared_objectIs(prevContext.memoizedValue, nextContext.memoizedValue)) return true;
							prevContext = prevContext.next;
							nextContext = nextContext.next;
						}
						return false;
					}
					function isHookThatCanScheduleUpdate(hookObject) {
						const queue = hookObject.queue;
						if (!queue) return false;
						const boundHasOwnProperty = shared_hasOwnProperty.bind(queue);
						if (boundHasOwnProperty("pending")) return true;
						return boundHasOwnProperty("value") && boundHasOwnProperty("getSnapshot") && typeof queue.getSnapshot === "function";
					}
					function didStatefulHookChange(prev, next) {
						const prevMemoizedState = prev.memoizedState;
						const nextMemoizedState = next.memoizedState;
						if (isHookThatCanScheduleUpdate(prev)) return prevMemoizedState !== nextMemoizedState;
						return false;
					}
					function getChangedHooksIndices(prev, next) {
						if (prev == null || next == null) return null;
						const indices = [];
						let index = 0;
						while (next !== null) {
							if (didStatefulHookChange(prev, next)) indices.push(index);
							next = next.next;
							prev = prev.next;
							index++;
						}
						return indices;
					}
					function getChangedKeys(prev, next) {
						if (prev == null || next == null) return null;
						const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
						const changedKeys = [];
						for (const key of keys) if (prev[key] !== next[key]) changedKeys.push(key);
						return changedKeys;
					}
					function didFiberRender(prevFiber, nextFiber) {
						switch (nextFiber.tag) {
							case ClassComponent:
							case FunctionComponent:
							case ContextConsumer:
							case MemoComponent:
							case SimpleMemoComponent:
							case ForwardRef:
								const PerformedWork = 1;
								return (getFiberFlags(nextFiber) & PerformedWork) === PerformedWork;
							default: return prevFiber.memoizedProps !== nextFiber.memoizedProps || prevFiber.memoizedState !== nextFiber.memoizedState || prevFiber.ref !== nextFiber.ref;
						}
					}
					const pendingOperations = [];
					const pendingRealUnmountedIDs = [];
					const pendingRealUnmountedSuspenseIDs = [];
					const pendingSuspenderChanges = /* @__PURE__ */ new Set();
					let pendingOperationsQueue = [];
					const pendingStringTable = /* @__PURE__ */ new Map();
					let pendingStringTableLength = 0;
					let pendingUnmountedRootID = null;
					function pushOperation(op) {
						pendingOperations.push(op);
					}
					function shouldBailoutWithPendingOperations() {
						if (isProfiling) {
							if (currentCommitProfilingMetadata != null && currentCommitProfilingMetadata.durations.length > 0) return false;
						}
						return pendingOperations.length === 0 && pendingRealUnmountedIDs.length === 0 && pendingRealUnmountedSuspenseIDs.length === 0 && pendingSuspenderChanges.size === 0 && pendingUnmountedRootID === null;
					}
					function flushOrQueueOperations(operations) {
						if (shouldBailoutWithPendingOperations()) return;
						if (pendingOperationsQueue !== null) pendingOperationsQueue.push(operations);
						else hook.emit("operations", operations);
					}
					function recordConsoleLogs(instance, componentLogsEntry) {
						if (componentLogsEntry === void 0) {
							if (instance.logCount === 0) return false;
							instance.logCount = 0;
							pushOperation(TREE_OPERATION_UPDATE_ERRORS_OR_WARNINGS);
							pushOperation(instance.id);
							pushOperation(0);
							pushOperation(0);
							return true;
						} else {
							const totalCount = componentLogsEntry.errorsCount + componentLogsEntry.warningsCount;
							if (instance.logCount === totalCount) return false;
							instance.logCount = totalCount;
							pushOperation(TREE_OPERATION_UPDATE_ERRORS_OR_WARNINGS);
							pushOperation(instance.id);
							pushOperation(componentLogsEntry.errorsCount);
							pushOperation(componentLogsEntry.warningsCount);
							return true;
						}
					}
					function flushPendingEvents() {
						if (shouldBailoutWithPendingOperations()) return;
						const numUnmountIDs = pendingRealUnmountedIDs.length + (pendingUnmountedRootID === null ? 0 : 1);
						const numUnmountSuspenseIDs = pendingRealUnmountedSuspenseIDs.length;
						const numSuspenderChanges = pendingSuspenderChanges.size;
						const operations = new Array(3 + pendingStringTableLength + (numUnmountSuspenseIDs > 0 ? 2 + numUnmountSuspenseIDs : 0) + (numUnmountIDs > 0 ? 2 + numUnmountIDs : 0) + pendingOperations.length + (numSuspenderChanges > 0 ? 2 + numSuspenderChanges * 3 : 0));
						let i = 0;
						operations[i++] = rendererID;
						if (currentRoot === null) operations[i++] = -1;
						else operations[i++] = currentRoot.id;
						operations[i++] = pendingStringTableLength;
						pendingStringTable.forEach((entry, stringKey) => {
							const encodedString = entry.encodedString;
							const length = encodedString.length;
							operations[i++] = length;
							for (let j = 0; j < length; j++) operations[i + j] = encodedString[j];
							i += length;
						});
						if (numUnmountSuspenseIDs > 0) {
							operations[i++] = SUSPENSE_TREE_OPERATION_REMOVE;
							operations[i++] = numUnmountSuspenseIDs;
							for (let j = 0; j < pendingRealUnmountedSuspenseIDs.length; j++) operations[i++] = pendingRealUnmountedSuspenseIDs[j];
						}
						if (numUnmountIDs > 0) {
							operations[i++] = TREE_OPERATION_REMOVE;
							operations[i++] = numUnmountIDs;
							for (let j = 0; j < pendingRealUnmountedIDs.length; j++) operations[i++] = pendingRealUnmountedIDs[j];
							if (pendingUnmountedRootID !== null) {
								operations[i] = pendingUnmountedRootID;
								i++;
							}
						}
						for (let j = 0; j < pendingOperations.length; j++) operations[i + j] = pendingOperations[j];
						i += pendingOperations.length;
						if (numSuspenderChanges > 0) {
							operations[i++] = SUSPENSE_TREE_OPERATION_SUSPENDERS;
							operations[i++] = numSuspenderChanges;
							pendingSuspenderChanges.forEach((fiberIdWithChanges) => {
								const suspense = idToSuspenseNodeMap.get(fiberIdWithChanges);
								if (suspense === void 0) throw new Error(`Could not send suspender changes for "${fiberIdWithChanges}" since the Fiber no longer exists.`);
								operations[i++] = fiberIdWithChanges;
								operations[i++] = suspense.hasUniqueSuspenders ? 1 : 0;
								const instance = suspense.instance;
								const isSuspended = (instance.kind === FIBER_INSTANCE || instance.kind === FILTERED_FIBER_INSTANCE) && instance.data.tag === SuspenseComponent && instance.data.memoizedState !== null;
								operations[i++] = isSuspended ? 1 : 0;
								operations[i++] = suspense.environments.size;
								suspense.environments.forEach((count, env) => {
									operations[i++] = getStringID(env);
								});
							});
						}
						flushOrQueueOperations(operations);
						pendingOperations.length = 0;
						pendingRealUnmountedIDs.length = 0;
						pendingRealUnmountedSuspenseIDs.length = 0;
						pendingSuspenderChanges.clear();
						pendingUnmountedRootID = null;
						pendingStringTable.clear();
						pendingStringTableLength = 0;
					}
					function measureHostInstance(instance) {
						if (typeof instance !== "object" || instance === null) return null;
						if (typeof instance.getClientRects === "function" || instance.nodeType === 3) {
							const doc = instance.ownerDocument;
							if (instance === doc.documentElement) return [{
								x: 0,
								y: 0,
								width: instance.scrollWidth,
								height: instance.scrollHeight
							}];
							const result = [];
							const win = doc && doc.defaultView;
							const scrollX = win ? win.scrollX : 0;
							const scrollY = win ? win.scrollY : 0;
							let rects;
							if (instance.nodeType === 3) {
								if (typeof doc.createRange !== "function") return null;
								const range = doc.createRange();
								if (typeof range.getClientRects !== "function") return null;
								range.selectNodeContents(instance);
								rects = range.getClientRects();
							} else rects = instance.getClientRects();
							for (let i = 0; i < rects.length; i++) {
								const rect = rects[i];
								result.push({
									x: rect.x + scrollX,
									y: rect.y + scrollY,
									width: rect.width,
									height: rect.height
								});
							}
							return result;
						}
						if (instance.canonical) {
							const publicInstance = instance.canonical.publicInstance;
							if (!publicInstance) return null;
							if (typeof publicInstance.getBoundingClientRect === "function") return [publicInstance.getBoundingClientRect()];
							if (typeof publicInstance.unstable_getBoundingClientRect === "function") return [publicInstance.unstable_getBoundingClientRect()];
						}
						return null;
					}
					function measureInstance(instance) {
						const hostInstances = findAllCurrentHostInstances(instance);
						let result = null;
						for (let i = 0; i < hostInstances.length; i++) {
							const childResult = measureHostInstance(hostInstances[i]);
							if (childResult !== null) if (result === null) result = childResult;
							else result = result.concat(childResult);
						}
						return result;
					}
					function getStringID(string) {
						if (string === null) return 0;
						const existingEntry = pendingStringTable.get(string);
						if (existingEntry !== void 0) return existingEntry.id;
						const id = pendingStringTable.size + 1;
						const encodedString = utfEncodeString(string);
						pendingStringTable.set(string, {
							encodedString,
							id
						});
						pendingStringTableLength += encodedString.length + 1;
						return id;
					}
					let isInDisconnectedSubtree = false;
					function recordMount(fiber, parentInstance) {
						const isRoot = fiber.tag === HostRoot;
						let fiberInstance;
						if (isRoot) {
							const entry = rootToFiberInstanceMap.get(fiber.stateNode);
							if (entry === void 0) throw new Error("The root should have been registered at this point");
							fiberInstance = entry;
						} else fiberInstance = createFiberInstance(fiber);
						idToDevToolsInstanceMap.set(fiberInstance.id, fiberInstance);
						recordReconnect(fiberInstance, parentInstance);
						return fiberInstance;
					}
					function recordReconnect(fiberInstance, parentInstance) {
						if (isInDisconnectedSubtree) return;
						const id = fiberInstance.id;
						const fiber = fiberInstance.data;
						const isProfilingSupported = fiber.hasOwnProperty("treeBaseDuration");
						if (fiber.tag === HostRoot) {
							const hasOwnerMetadata = fiber.hasOwnProperty("_debugOwner");
							let profilingFlags = 0;
							if (isProfilingSupported) {
								profilingFlags = PROFILING_FLAG_BASIC_SUPPORT;
								if (typeof injectProfilingHooks === "function") profilingFlags |= PROFILING_FLAG_TIMELINE_SUPPORT;
								if (supportsPerformanceTracks) profilingFlags |= PROFILING_FLAG_PERFORMANCE_TRACKS_SUPPORT;
							}
							const isProductionBuildOfRenderer = renderer.bundleType === 0;
							pushOperation(TREE_OPERATION_ADD);
							pushOperation(id);
							pushOperation(ElementTypeRoot);
							pushOperation((fiber.mode & StrictModeBits) !== 0 ? 1 : 0);
							pushOperation(profilingFlags);
							pushOperation(!isProductionBuildOfRenderer && StrictModeBits !== 0 ? 1 : 0);
							pushOperation(hasOwnerMetadata ? 1 : 0);
							if (isProfiling) {
								if (displayNamesByRootID !== null) displayNamesByRootID.set(id, getDisplayNameForRoot(fiber));
							}
						} else {
							const { key } = fiber;
							const displayName = getDisplayNameForFiber(fiber);
							const elementType = getElementTypeForFiber(fiber);
							const debugOwner = getUnfilteredOwner(fiber);
							const ownerInstance = findNearestOwnerInstance(parentInstance, debugOwner);
							if (ownerInstance !== null && debugOwner === fiber._debugOwner && fiber._debugStack != null && ownerInstance.source === null) ownerInstance.source = fiber._debugStack;
							let unfilteredParent = parentInstance;
							while (unfilteredParent !== null && unfilteredParent.kind === FILTERED_FIBER_INSTANCE) unfilteredParent = unfilteredParent.parent;
							const ownerID = ownerInstance === null ? 0 : ownerInstance.id;
							const parentID = unfilteredParent === null ? 0 : unfilteredParent.id;
							const displayNameStringID = getStringID(displayName);
							const keyStringID = getStringID(key === null ? null : String(key));
							const nameProp = fiber.tag === SuspenseComponent ? fiber.memoizedProps.name : fiber.tag === ActivityComponent ? fiber.memoizedProps.name : null;
							const namePropStringID = getStringID(nameProp == null ? null : String(nameProp));
							pushOperation(TREE_OPERATION_ADD);
							pushOperation(id);
							pushOperation(elementType);
							pushOperation(parentID);
							pushOperation(ownerID);
							pushOperation(displayNameStringID);
							pushOperation(keyStringID);
							pushOperation(namePropStringID);
							if ((fiber.mode & StrictModeBits) !== 0) {
								let parentFiber = null;
								let parentFiberInstance = parentInstance;
								while (parentFiberInstance !== null) {
									if (parentFiberInstance.kind === FIBER_INSTANCE) {
										parentFiber = parentFiberInstance.data;
										break;
									}
									parentFiberInstance = parentFiberInstance.parent;
								}
								if (parentFiber === null || (parentFiber.mode & StrictModeBits) === 0) {
									pushOperation(TREE_OPERATION_SET_SUBTREE_MODE);
									pushOperation(id);
									pushOperation(StrictMode);
								}
							}
						}
						let componentLogsEntry = fiberToComponentLogsMap.get(fiber);
						if (componentLogsEntry === void 0 && fiber.alternate !== null) componentLogsEntry = fiberToComponentLogsMap.get(fiber.alternate);
						recordConsoleLogs(fiberInstance, componentLogsEntry);
						if (isProfilingSupported) recordProfilingDurations(fiberInstance, null);
					}
					function recordVirtualMount(instance, parentInstance, secondaryEnv) {
						const id = instance.id;
						idToDevToolsInstanceMap.set(id, instance);
						recordVirtualReconnect(instance, parentInstance, secondaryEnv);
					}
					function recordVirtualReconnect(instance, parentInstance, secondaryEnv) {
						if (isInDisconnectedSubtree) return;
						const componentInfo = instance.data;
						const key = typeof componentInfo.key === "string" ? componentInfo.key : null;
						const env = componentInfo.env;
						let displayName = componentInfo.name || "";
						if (typeof env === "string") {
							if (secondaryEnv !== null) displayName = secondaryEnv + "(" + displayName + ")";
							displayName = env + "(" + displayName + ")";
						}
						const elementType = types_ElementTypeVirtual;
						const debugOwner = getUnfilteredOwner(componentInfo);
						const ownerInstance = findNearestOwnerInstance(parentInstance, debugOwner);
						if (ownerInstance !== null && debugOwner === componentInfo.owner && componentInfo.debugStack != null && ownerInstance.source === null) ownerInstance.source = componentInfo.debugStack;
						let unfilteredParent = parentInstance;
						while (unfilteredParent !== null && unfilteredParent.kind === FILTERED_FIBER_INSTANCE) unfilteredParent = unfilteredParent.parent;
						const ownerID = ownerInstance === null ? 0 : ownerInstance.id;
						const parentID = unfilteredParent === null ? 0 : unfilteredParent.id;
						const displayNameStringID = getStringID(displayName);
						const keyStringID = getStringID(key === null ? null : String(key));
						const namePropStringID = getStringID(null);
						const id = instance.id;
						pushOperation(TREE_OPERATION_ADD);
						pushOperation(id);
						pushOperation(elementType);
						pushOperation(parentID);
						pushOperation(ownerID);
						pushOperation(displayNameStringID);
						pushOperation(keyStringID);
						pushOperation(namePropStringID);
						recordConsoleLogs(instance, componentInfoToComponentLogsMap.get(componentInfo));
					}
					function recordSuspenseMount(suspenseInstance, parentSuspenseInstance) {
						const fiberInstance = suspenseInstance.instance;
						if (fiberInstance.kind === FILTERED_FIBER_INSTANCE) throw new Error("Cannot record a mount for a filtered Fiber instance.");
						const fiberID = fiberInstance.id;
						let unfilteredParent = parentSuspenseInstance;
						while (unfilteredParent !== null && unfilteredParent.instance.kind === FILTERED_FIBER_INSTANCE) unfilteredParent = unfilteredParent.parent;
						const unfilteredParentInstance = unfilteredParent !== null ? unfilteredParent.instance : null;
						if (unfilteredParentInstance !== null && unfilteredParentInstance.kind === FILTERED_FIBER_INSTANCE) throw new Error("Should not have a filtered instance at this point. This is a bug.");
						const parentID = unfilteredParentInstance === null ? 0 : unfilteredParentInstance.id;
						const fiber = fiberInstance.data;
						const props = fiber.memoizedProps;
						const nameStringID = getStringID(fiber.tag !== SuspenseComponent || props === null ? null : props.name || null);
						const isSuspended = fiber.tag === SuspenseComponent && fiber.memoizedState !== null;
						idToSuspenseNodeMap.set(fiberID, suspenseInstance);
						pushOperation(SUSPENSE_TREE_OPERATION_ADD);
						pushOperation(fiberID);
						pushOperation(parentID);
						pushOperation(nameStringID);
						pushOperation(isSuspended ? 1 : 0);
						const rects = suspenseInstance.rects;
						if (rects === null) pushOperation(-1);
						else {
							pushOperation(rects.length);
							for (let i = 0; i < rects.length; ++i) {
								const rect = rects[i];
								pushOperation(Math.round(rect.x * 1e3));
								pushOperation(Math.round(rect.y * 1e3));
								pushOperation(Math.round(rect.width * 1e3));
								pushOperation(Math.round(rect.height * 1e3));
							}
						}
					}
					function recordUnmount(fiberInstance) {
						recordDisconnect(fiberInstance);
						const suspenseNode = fiberInstance.suspenseNode;
						if (suspenseNode !== null) recordSuspenseUnmount(suspenseNode);
						idToDevToolsInstanceMap.delete(fiberInstance.id);
						untrackFiber(fiberInstance, fiberInstance.data);
					}
					function recordDisconnect(fiberInstance) {
						if (isInDisconnectedSubtree) return;
						const fiber = fiberInstance.data;
						if (trackedPathMatchInstance === fiberInstance) setTrackedPath(null);
						const id = fiberInstance.id;
						if (fiber.tag === HostRoot) pendingUnmountedRootID = id;
						else pendingRealUnmountedIDs.push(id);
					}
					function recordSuspenseResize(suspenseNode) {
						const fiberInstance = suspenseNode.instance;
						if (fiberInstance.kind !== FIBER_INSTANCE) return;
						pushOperation(SUSPENSE_TREE_OPERATION_RESIZE);
						pushOperation(fiberInstance.id);
						const rects = suspenseNode.rects;
						if (rects === null) pushOperation(-1);
						else {
							pushOperation(rects.length);
							for (let i = 0; i < rects.length; ++i) {
								const rect = rects[i];
								pushOperation(Math.round(rect.x * 1e3));
								pushOperation(Math.round(rect.y * 1e3));
								pushOperation(Math.round(rect.width * 1e3));
								pushOperation(Math.round(rect.height * 1e3));
							}
						}
					}
					function recordSuspenseSuspenders(suspenseNode) {
						const fiberInstance = suspenseNode.instance;
						if (fiberInstance.kind !== FIBER_INSTANCE) return;
						suspenseNode.environments.forEach((count, env) => {
							getStringID(env);
						});
						pendingSuspenderChanges.add(fiberInstance.id);
					}
					function recordSuspenseUnmount(suspenseInstance) {
						const devtoolsInstance = suspenseInstance.instance;
						if (devtoolsInstance.kind !== FIBER_INSTANCE) throw new Error("Can't unmount a filtered SuspenseNode. This is a bug.");
						const id = devtoolsInstance.id;
						pendingRealUnmountedSuspenseIDs.push(id);
						pendingSuspenderChanges.delete(id);
						idToSuspenseNodeMap.delete(id);
					}
					let remainingReconcilingChildren = null;
					let previouslyReconciledSibling = null;
					let reconcilingParent = null;
					let remainingReconcilingChildrenSuspenseNodes = null;
					let previouslyReconciledSiblingSuspenseNode = null;
					let reconcilingParentSuspenseNode = null;
					function ioExistsInSuspenseAncestor(suspenseNode, ioInfo) {
						let ancestor = suspenseNode.parent;
						while (ancestor !== null) {
							if (ancestor.suspendedBy.has(ioInfo)) return true;
							ancestor = ancestor.parent;
						}
						return false;
					}
					function insertSuspendedBy(asyncInfo) {
						if (reconcilingParent === null || reconcilingParentSuspenseNode === null) throw new Error("It should not be possible to have suspended data outside the root. Even suspending at the first position is still a child of the root.");
						const parentSuspenseNode = reconcilingParentSuspenseNode;
						let parentInstance = reconcilingParent;
						while (parentInstance.kind === FILTERED_FIBER_INSTANCE && parentInstance.parent !== null && parentInstance !== parentSuspenseNode.instance) parentInstance = parentInstance.parent;
						const suspenseNodeSuspendedBy = parentSuspenseNode.suspendedBy;
						const ioInfo = asyncInfo.awaited;
						let suspendedBySet = suspenseNodeSuspendedBy.get(ioInfo);
						if (suspendedBySet === void 0) {
							suspendedBySet = /* @__PURE__ */ new Set();
							suspenseNodeSuspendedBy.set(ioInfo, suspendedBySet);
							const env = ioInfo.env;
							if (env != null) {
								const environmentCounts = parentSuspenseNode.environments;
								const count = environmentCounts.get(env);
								if (count === void 0 || count === 0) {
									environmentCounts.set(env, 1);
									recordSuspenseSuspenders(parentSuspenseNode);
								} else environmentCounts.set(env, count + 1);
							}
						}
						if (!suspendedBySet.has(parentInstance)) {
							suspendedBySet.add(parentInstance);
							if (!parentSuspenseNode.hasUniqueSuspenders && !ioExistsInSuspenseAncestor(parentSuspenseNode, ioInfo)) {
								parentSuspenseNode.hasUniqueSuspenders = true;
								recordSuspenseSuspenders(parentSuspenseNode);
							}
						}
						parentSuspenseNode.hasUnknownSuspenders = false;
						const suspendedBy = parentInstance.suspendedBy;
						if (suspendedBy === null) parentInstance.suspendedBy = [asyncInfo];
						else if (suspendedBy.indexOf(asyncInfo) === -1) suspendedBy.push(asyncInfo);
					}
					function getAwaitInSuspendedByFromIO(suspensedBy, ioInfo) {
						for (let i = 0; i < suspensedBy.length; i++) {
							const asyncInfo = suspensedBy[i];
							if (asyncInfo.awaited === ioInfo) return asyncInfo;
						}
						return null;
					}
					function unblockSuspendedBy(parentSuspenseNode, ioInfo) {
						const firstChild = parentSuspenseNode.firstChild;
						if (firstChild === null) return;
						let node = firstChild;
						while (node !== null) {
							if (node.suspendedBy.has(ioInfo)) {
								if (!node.hasUniqueSuspenders) recordSuspenseSuspenders(node);
								node.hasUniqueSuspenders = true;
								node.hasUnknownSuspenders = false;
							} else if (node.firstChild !== null) {
								node = node.firstChild;
								continue;
							}
							while (node.nextSibling === null) {
								if (node.parent === null || node.parent === parentSuspenseNode) return;
								node = node.parent;
							}
							node = node.nextSibling;
						}
					}
					function removePreviousSuspendedBy(instance, previousSuspendedBy, parentSuspenseNode) {
						const suspenseNode = instance.suspenseNode === null ? parentSuspenseNode : instance.suspenseNode;
						if (previousSuspendedBy !== null && suspenseNode !== null) {
							const nextSuspendedBy = instance.suspendedBy;
							let changedEnvironment = false;
							for (let i = 0; i < previousSuspendedBy.length; i++) {
								const asyncInfo = previousSuspendedBy[i];
								if (nextSuspendedBy === null || nextSuspendedBy.indexOf(asyncInfo) === -1 && getAwaitInSuspendedByFromIO(nextSuspendedBy, asyncInfo.awaited) === null) {
									const ioInfo = asyncInfo.awaited;
									const suspendedBySet = suspenseNode.suspendedBy.get(ioInfo);
									if (suspendedBySet === void 0 || !suspendedBySet.delete(instance)) {
										let alreadyRemovedIO = false;
										for (let j = 0; j < i; j++) if (previousSuspendedBy[j].awaited === ioInfo) {
											alreadyRemovedIO = true;
											break;
										}
										if (!alreadyRemovedIO) throw new Error("We are cleaning up async info that was not on the parent Suspense boundary. This is a bug in React.");
									}
									if (suspendedBySet !== void 0 && suspendedBySet.size === 0) {
										suspenseNode.suspendedBy.delete(ioInfo);
										const env = ioInfo.env;
										if (env != null) {
											const environmentCounts = suspenseNode.environments;
											const count = environmentCounts.get(env);
											if (count === void 0 || count === 0) throw new Error("We are removing an environment but it was not in the set. This is a bug in React.");
											if (count === 1) {
												environmentCounts.delete(env);
												changedEnvironment = true;
											} else environmentCounts.set(env, count - 1);
										}
									}
									if (suspenseNode.hasUniqueSuspenders && !ioExistsInSuspenseAncestor(suspenseNode, ioInfo)) unblockSuspendedBy(suspenseNode, ioInfo);
								}
							}
							if (changedEnvironment) recordSuspenseSuspenders(suspenseNode);
						}
					}
					function insertChild(instance) {
						const parentInstance = reconcilingParent;
						if (parentInstance === null) return;
						instance.parent = parentInstance;
						if (previouslyReconciledSibling === null) {
							previouslyReconciledSibling = instance;
							parentInstance.firstChild = instance;
						} else {
							previouslyReconciledSibling.nextSibling = instance;
							previouslyReconciledSibling = instance;
						}
						instance.nextSibling = null;
						const suspenseNode = instance.suspenseNode;
						if (suspenseNode !== null) {
							const parentNode = reconcilingParentSuspenseNode;
							if (parentNode !== null) {
								suspenseNode.parent = parentNode;
								if (previouslyReconciledSiblingSuspenseNode === null) {
									previouslyReconciledSiblingSuspenseNode = suspenseNode;
									parentNode.firstChild = suspenseNode;
								} else {
									previouslyReconciledSiblingSuspenseNode.nextSibling = suspenseNode;
									previouslyReconciledSiblingSuspenseNode = suspenseNode;
								}
								suspenseNode.nextSibling = null;
							}
						}
					}
					function moveChild(instance, previousSibling) {
						removeChild(instance, previousSibling);
						insertChild(instance);
					}
					function removeChild(instance, previousSibling) {
						if (instance.parent === null) {
							if (remainingReconcilingChildren === instance) throw new Error("Remaining children should not have items with no parent");
							else if (instance.nextSibling !== null) throw new Error("A deleted instance should not have next siblings");
							return;
						}
						const parentInstance = reconcilingParent;
						if (parentInstance === null) throw new Error("Should not have a parent if we are at the root");
						if (instance.parent !== parentInstance) throw new Error("Cannot remove a node from a different parent than is being reconciled.");
						if (previousSibling === null) {
							if (remainingReconcilingChildren !== instance) throw new Error("Expected a placed child to be moved from the remaining set.");
							remainingReconcilingChildren = instance.nextSibling;
						} else previousSibling.nextSibling = instance.nextSibling;
						instance.nextSibling = null;
						instance.parent = null;
						const suspenseNode = instance.suspenseNode;
						if (suspenseNode !== null && suspenseNode.parent !== null) {
							const parentNode = reconcilingParentSuspenseNode;
							if (parentNode === null) throw new Error("Should not have a parent if we are at the root");
							if (suspenseNode.parent !== parentNode) throw new Error("Cannot remove a Suspense node from a different parent than is being reconciled.");
							let previousSuspenseSibling = remainingReconcilingChildrenSuspenseNodes;
							if (previousSuspenseSibling === suspenseNode) remainingReconcilingChildrenSuspenseNodes = suspenseNode.nextSibling;
							else while (previousSuspenseSibling !== null) {
								if (previousSuspenseSibling.nextSibling === suspenseNode) {
									previousSuspenseSibling.nextSibling = suspenseNode.nextSibling;
									break;
								}
								previousSuspenseSibling = previousSuspenseSibling.nextSibling;
							}
							suspenseNode.nextSibling = null;
							suspenseNode.parent = null;
						}
					}
					function isHiddenOffscreen(fiber) {
						switch (fiber.tag) {
							case LegacyHiddenComponent:
							case OffscreenComponent: return fiber.memoizedState !== null;
							default: return false;
						}
					}
					function isSuspendedOffscreen(fiber) {
						switch (fiber.tag) {
							case LegacyHiddenComponent:
							case OffscreenComponent: return fiber.memoizedState !== null && fiber.return !== null && fiber.return.tag === SuspenseComponent;
							default: return false;
						}
					}
					function unmountRemainingChildren() {
						if (reconcilingParent !== null && (reconcilingParent.kind === FIBER_INSTANCE || reconcilingParent.kind === FILTERED_FIBER_INSTANCE) && isSuspendedOffscreen(reconcilingParent.data) && !isInDisconnectedSubtree) {
							isInDisconnectedSubtree = true;
							try {
								let child = remainingReconcilingChildren;
								while (child !== null) {
									unmountInstanceRecursively(child);
									child = remainingReconcilingChildren;
								}
							} finally {
								isInDisconnectedSubtree = false;
							}
						} else {
							let child = remainingReconcilingChildren;
							while (child !== null) {
								unmountInstanceRecursively(child);
								child = remainingReconcilingChildren;
							}
						}
					}
					function unmountSuspenseChildrenRecursively(contentInstance, stashedSuspenseParent, stashedSuspensePrevious, stashedSuspenseRemaining) {
						unmountInstanceRecursively(contentInstance);
						reconcilingParentSuspenseNode = stashedSuspenseParent;
						previouslyReconciledSiblingSuspenseNode = stashedSuspensePrevious;
						remainingReconcilingChildrenSuspenseNodes = stashedSuspenseRemaining;
						unmountRemainingChildren();
					}
					function isChildOf(parentInstance, childInstance, grandParent) {
						let instance = childInstance.parent;
						while (instance !== null) {
							if (parentInstance === instance) return true;
							if (instance === parentInstance.parent || instance === grandParent) break;
							instance = instance.parent;
						}
						return false;
					}
					function areEqualRects(a, b) {
						if (a === null) return b === null;
						if (b === null) return false;
						if (a.length !== b.length) return false;
						for (let i = 0; i < a.length; i++) {
							const aRect = a[i];
							const bRect = b[i];
							if (aRect.x !== bRect.x || aRect.y !== bRect.y || aRect.width !== bRect.width || aRect.height !== bRect.height) return false;
						}
						return true;
					}
					function measureUnchangedSuspenseNodesRecursively(suspenseNode) {
						if (isInDisconnectedSubtree) return;
						const instance = suspenseNode.instance;
						if ((instance.kind === FIBER_INSTANCE || instance.kind === FILTERED_FIBER_INSTANCE) && instance.data.tag === SuspenseComponent && instance.data.memoizedState !== null) return;
						let parent = instance.parent;
						while (parent !== null) {
							if ((parent.kind === FIBER_INSTANCE || parent.kind === FILTERED_FIBER_INSTANCE) && isHiddenOffscreen(parent.data)) return;
							if (parent.suspenseNode !== null) break;
							parent = parent.parent;
						}
						const nextRects = measureInstance(suspenseNode.instance);
						const prevRects = suspenseNode.rects;
						if (areEqualRects(prevRects, nextRects)) return;
						for (let child = suspenseNode.firstChild; child !== null; child = child.nextSibling) measureUnchangedSuspenseNodesRecursively(child);
						suspenseNode.rects = nextRects;
						recordSuspenseResize(suspenseNode);
					}
					function consumeSuspenseNodesOfExistingInstance(instance) {
						let suspenseNode = remainingReconcilingChildrenSuspenseNodes;
						if (suspenseNode === null) return;
						const parentSuspenseNode = reconcilingParentSuspenseNode;
						if (parentSuspenseNode === null) throw new Error("The should not be any remaining suspense node children if there is no parent.");
						let foundOne = false;
						let previousSkippedSibling = null;
						while (suspenseNode !== null) if (isChildOf(instance, suspenseNode.instance, parentSuspenseNode.instance)) {
							foundOne = true;
							const nextRemainingSibling = suspenseNode.nextSibling;
							if (previousSkippedSibling === null) remainingReconcilingChildrenSuspenseNodes = nextRemainingSibling;
							else previousSkippedSibling.nextSibling = nextRemainingSibling;
							suspenseNode.nextSibling = null;
							if (previouslyReconciledSiblingSuspenseNode === null) parentSuspenseNode.firstChild = suspenseNode;
							else previouslyReconciledSiblingSuspenseNode.nextSibling = suspenseNode;
							previouslyReconciledSiblingSuspenseNode = suspenseNode;
							measureUnchangedSuspenseNodesRecursively(suspenseNode);
							suspenseNode = nextRemainingSibling;
						} else if (foundOne) break;
						else {
							previousSkippedSibling = suspenseNode;
							suspenseNode = suspenseNode.nextSibling;
						}
					}
					function mountVirtualInstanceRecursively(virtualInstance, firstChild, lastChild, traceNearestHostComponentUpdate, virtualLevel) {
						const mightSiblingsBeOnTrackedPath = updateVirtualTrackedPathStateBeforeMount(virtualInstance, reconcilingParent);
						const stashedParent = reconcilingParent;
						const stashedPrevious = previouslyReconciledSibling;
						const stashedRemaining = remainingReconcilingChildren;
						reconcilingParent = virtualInstance;
						previouslyReconciledSibling = null;
						remainingReconcilingChildren = null;
						try {
							mountVirtualChildrenRecursively(firstChild, lastChild, traceNearestHostComponentUpdate, virtualLevel + 1);
							recordVirtualProfilingDurations(virtualInstance);
						} finally {
							reconcilingParent = stashedParent;
							previouslyReconciledSibling = stashedPrevious;
							remainingReconcilingChildren = stashedRemaining;
							updateTrackedPathStateAfterMount(mightSiblingsBeOnTrackedPath);
						}
					}
					function recordVirtualUnmount(instance) {
						recordVirtualDisconnect(instance);
						idToDevToolsInstanceMap.delete(instance.id);
					}
					function recordVirtualDisconnect(instance) {
						if (isInDisconnectedSubtree) return;
						if (trackedPathMatchInstance === instance) setTrackedPath(null);
						const id = instance.id;
						pendingRealUnmountedIDs.push(id);
					}
					function getSecondaryEnvironmentName(debugInfo, index) {
						if (debugInfo != null) {
							const componentInfo = debugInfo[index];
							for (let i = index + 1; i < debugInfo.length; i++) {
								const debugEntry = debugInfo[i];
								if (typeof debugEntry.env === "string") return componentInfo.env !== debugEntry.env ? debugEntry.env : null;
							}
						}
						return null;
					}
					function trackDebugInfoFromLazyType(fiber) {
						const type = fiber.elementType;
						if (getTypeSymbol(type) === LAZY_SYMBOL_STRING) {
							const debugInfo = type._debugInfo;
							if (debugInfo) for (let i = 0; i < debugInfo.length; i++) {
								const debugEntry = debugInfo[i];
								if (debugEntry.awaited) insertSuspendedBy(debugEntry);
							}
						}
					}
					function trackDebugInfoFromUsedThenables(fiber) {
						const dependencies = fiber.dependencies;
						if (dependencies == null) return;
						const thenableState = dependencies._debugThenableState;
						if (thenableState == null) return;
						const usedThenables = thenableState.thenables || thenableState;
						if (!Array.isArray(usedThenables)) return;
						for (let i = 0; i < usedThenables.length; i++) {
							const debugInfo = usedThenables[i]._debugInfo;
							if (debugInfo) for (let j = 0; j < debugInfo.length; j++) {
								const debugEntry = debugInfo[j];
								if (debugEntry.awaited) insertSuspendedBy(debugEntry);
							}
						}
					}
					const hostAsyncInfoCache = /* @__PURE__ */ new WeakMap();
					function trackDebugInfoFromHostResource(devtoolsInstance, fiber) {
						const resource = fiber.memoizedState;
						if (resource == null) return;
						const existingEntry = hostAsyncInfoCache.get(resource);
						if (existingEntry !== void 0) {
							insertSuspendedBy(existingEntry);
							return;
						}
						const props = fiber.memoizedProps;
						if (!(resource.type === "stylesheet" && (typeof props.media !== "string" || typeof matchMedia !== "function" || matchMedia(props.media)))) return;
						const instance = resource.instance;
						if (instance == null) return;
						const href = instance.href;
						if (typeof href !== "string") return;
						let start = -1;
						let end = -1;
						let byteSize = 0;
						if (typeof performance.getEntriesByType === "function") {
							const resourceEntries = performance.getEntriesByType("resource");
							for (let i = 0; i < resourceEntries.length; i++) {
								const resourceEntry = resourceEntries[i];
								if (resourceEntry.name === href) {
									start = resourceEntry.startTime;
									end = start + resourceEntry.duration;
									byteSize = resourceEntry.transferSize || 0;
								}
							}
						}
						const value = instance.sheet;
						const promise = Promise.resolve(value);
						promise.status = "fulfilled";
						promise.value = value;
						const ioInfo = {
							name: "stylesheet",
							start,
							end,
							value: promise,
							owner: fiber
						};
						if (byteSize > 0) ioInfo.byteSize = byteSize;
						const asyncInfo = {
							awaited: ioInfo,
							owner: fiber._debugOwner == null ? null : fiber._debugOwner,
							debugStack: fiber._debugStack == null ? null : fiber._debugStack,
							debugTask: fiber._debugTask == null ? null : fiber._debugTask
						};
						hostAsyncInfoCache.set(resource, asyncInfo);
						insertSuspendedBy(asyncInfo);
					}
					function trackDebugInfoFromHostComponent(devtoolsInstance, fiber) {
						if (fiber.tag !== HostComponent) return;
						if ((fiber.mode & SuspenseyImagesMode) === 0) return;
						const type = fiber.type;
						const props = fiber.memoizedProps;
						if (!(type === "img" && props.src != null && props.src !== "" && props.onLoad == null && props.loading !== "lazy")) return;
						const instance = fiber.stateNode;
						if (instance == null) return;
						const src = instance.currentSrc;
						if (typeof src !== "string" || src === "") return;
						let start = -1;
						let end = -1;
						let byteSize = 0;
						let fileSize = 0;
						if (typeof performance.getEntriesByType === "function") {
							const resourceEntries = performance.getEntriesByType("resource");
							for (let i = 0; i < resourceEntries.length; i++) {
								const resourceEntry = resourceEntries[i];
								if (resourceEntry.name === src) {
									start = resourceEntry.startTime;
									end = start + resourceEntry.duration;
									fileSize = resourceEntry.decodedBodySize || 0;
									byteSize = resourceEntry.transferSize || 0;
								}
							}
						}
						const value = { currentSrc: src };
						if (instance.naturalWidth > 0 && instance.naturalHeight > 0) {
							value.naturalWidth = instance.naturalWidth;
							value.naturalHeight = instance.naturalHeight;
						}
						if (fileSize > 0) value.fileSize = fileSize;
						const promise = Promise.resolve(value);
						promise.status = "fulfilled";
						promise.value = value;
						const ioInfo = {
							name: "img",
							start,
							end,
							value: promise,
							owner: fiber
						};
						if (byteSize > 0) ioInfo.byteSize = byteSize;
						insertSuspendedBy({
							awaited: ioInfo,
							owner: fiber._debugOwner == null ? null : fiber._debugOwner,
							debugStack: fiber._debugStack == null ? null : fiber._debugStack,
							debugTask: fiber._debugTask == null ? null : fiber._debugTask
						});
					}
					function trackThrownPromisesFromRetryCache(suspenseNode, retryCache) {
						if (retryCache != null) {
							if (!suspenseNode.hasUniqueSuspenders) recordSuspenseSuspenders(suspenseNode);
							suspenseNode.hasUniqueSuspenders = true;
							suspenseNode.hasUnknownSuspenders = true;
						}
					}
					function mountVirtualChildrenRecursively(firstChild, lastChild, traceNearestHostComponentUpdate, virtualLevel) {
						let fiber = firstChild;
						let previousVirtualInstance = null;
						let previousVirtualInstanceFirstFiber = firstChild;
						while (fiber !== null && fiber !== lastChild) {
							let level = 0;
							if (fiber._debugInfo) for (let i = 0; i < fiber._debugInfo.length; i++) {
								const debugEntry = fiber._debugInfo[i];
								if (debugEntry.awaited) {
									const asyncInfo = debugEntry;
									if (level === virtualLevel) insertSuspendedBy(asyncInfo);
									continue;
								}
								if (typeof debugEntry.name !== "string") continue;
								const componentInfo = debugEntry;
								const secondaryEnv = getSecondaryEnvironmentName(fiber._debugInfo, i);
								if (componentInfo.env != null) knownEnvironmentNames.add(componentInfo.env);
								if (secondaryEnv !== null) knownEnvironmentNames.add(secondaryEnv);
								if (shouldFilterVirtual(componentInfo, secondaryEnv)) continue;
								if (level === virtualLevel) {
									if (previousVirtualInstance === null || previousVirtualInstance.data !== debugEntry) {
										if (previousVirtualInstance !== null) mountVirtualInstanceRecursively(previousVirtualInstance, previousVirtualInstanceFirstFiber, fiber, traceNearestHostComponentUpdate, virtualLevel);
										previousVirtualInstance = createVirtualInstance(componentInfo);
										recordVirtualMount(previousVirtualInstance, reconcilingParent, secondaryEnv);
										insertChild(previousVirtualInstance);
										previousVirtualInstanceFirstFiber = fiber;
									}
									level++;
									break;
								} else level++;
							}
							if (level === virtualLevel) {
								if (previousVirtualInstance !== null) {
									mountVirtualInstanceRecursively(previousVirtualInstance, previousVirtualInstanceFirstFiber, fiber, traceNearestHostComponentUpdate, virtualLevel);
									previousVirtualInstance = null;
								}
								mountFiberRecursively(fiber, traceNearestHostComponentUpdate);
							}
							fiber = fiber.sibling;
						}
						if (previousVirtualInstance !== null) mountVirtualInstanceRecursively(previousVirtualInstance, previousVirtualInstanceFirstFiber, null, traceNearestHostComponentUpdate, virtualLevel);
					}
					function mountChildrenRecursively(firstChild, traceNearestHostComponentUpdate) {
						mountVirtualChildrenRecursively(firstChild, null, traceNearestHostComponentUpdate, 0);
					}
					function mountSuspenseChildrenRecursively(contentFiber, traceNearestHostComponentUpdate, stashedSuspenseParent, stashedSuspensePrevious, stashedSuspenseRemaining) {
						const fallbackFiber = contentFiber.sibling;
						mountVirtualChildrenRecursively(contentFiber, fallbackFiber, traceNearestHostComponentUpdate, 0);
						reconcilingParentSuspenseNode = stashedSuspenseParent;
						previouslyReconciledSiblingSuspenseNode = stashedSuspensePrevious;
						remainingReconcilingChildrenSuspenseNodes = stashedSuspenseRemaining;
						if (fallbackFiber !== null) mountVirtualChildrenRecursively(fallbackFiber, null, traceNearestHostComponentUpdate, 0);
					}
					function mountFiberRecursively(fiber, traceNearestHostComponentUpdate) {
						const shouldIncludeInTree = !shouldFilterFiber(fiber);
						let newInstance = null;
						let newSuspenseNode = null;
						if (shouldIncludeInTree) {
							newInstance = recordMount(fiber, reconcilingParent);
							if (fiber.tag === SuspenseComponent || fiber.tag === HostRoot) {
								newSuspenseNode = createSuspenseNode(newInstance);
								if (fiber.tag === SuspenseComponent) if (OffscreenComponent === -1) {
									if (!(fiber.memoizedState !== null)) newSuspenseNode.rects = measureInstance(newInstance);
								} else {
									if (isFiberHydrated(fiber)) {
										if (fiber.child === null) throw new Error("There should always be an Offscreen Fiber child in a hydrated Suspense boundary.");
									}
									if (!(fiber.memoizedState !== null)) newSuspenseNode.rects = measureInstance(newInstance);
								}
								else newSuspenseNode.rects = measureInstance(newInstance);
								recordSuspenseMount(newSuspenseNode, reconcilingParentSuspenseNode);
							}
							insertChild(newInstance);
						} else if (reconcilingParent !== null && reconcilingParent.kind === VIRTUAL_INSTANCE || fiber.tag === SuspenseComponent || fiber.tag === OffscreenComponent || fiber.tag === LegacyHiddenComponent) {
							if (reconcilingParent !== null && reconcilingParent.kind === VIRTUAL_INSTANCE && reconcilingParent.data === fiber._debugOwner && fiber._debugStack != null && reconcilingParent.source === null) reconcilingParent.source = fiber._debugStack;
							newInstance = createFilteredFiberInstance(fiber);
							if (fiber.tag === SuspenseComponent) {
								newSuspenseNode = createSuspenseNode(newInstance);
								if (OffscreenComponent === -1) {
									if (!(fiber.memoizedState !== null)) newSuspenseNode.rects = measureInstance(newInstance);
								} else {
									if (isFiberHydrated(fiber)) {
										if (fiber.child === null) throw new Error("There should always be an Offscreen Fiber child in a hydrated Suspense boundary.");
									}
									if (!(fiber.memoizedState !== null)) newSuspenseNode.rects = measureInstance(newInstance);
								}
							}
							insertChild(newInstance);
						}
						const mightSiblingsBeOnTrackedPath = updateTrackedPathStateBeforeMount(fiber, newInstance);
						const stashedParent = reconcilingParent;
						const stashedPrevious = previouslyReconciledSibling;
						const stashedRemaining = remainingReconcilingChildren;
						const stashedSuspenseParent = reconcilingParentSuspenseNode;
						const stashedSuspensePrevious = previouslyReconciledSiblingSuspenseNode;
						const stashedSuspenseRemaining = remainingReconcilingChildrenSuspenseNodes;
						if (newInstance !== null) {
							reconcilingParent = newInstance;
							previouslyReconciledSibling = null;
							remainingReconcilingChildren = null;
						}
						let shouldPopSuspenseNode = false;
						if (newSuspenseNode !== null) {
							reconcilingParentSuspenseNode = newSuspenseNode;
							previouslyReconciledSiblingSuspenseNode = null;
							remainingReconcilingChildrenSuspenseNodes = null;
							shouldPopSuspenseNode = true;
						}
						try {
							if (traceUpdatesEnabled) {
								if (traceNearestHostComponentUpdate) {
									if (getElementTypeForFiber(fiber) === ElementTypeHostComponent) {
										traceUpdatesForNodes.add(fiber.stateNode);
										traceNearestHostComponentUpdate = false;
									}
								}
							}
							trackDebugInfoFromLazyType(fiber);
							trackDebugInfoFromUsedThenables(fiber);
							if (fiber.tag === HostHoistable) {
								const nearestInstance = reconcilingParent;
								if (nearestInstance === null) throw new Error("Did not expect a host hoistable to be the root");
								aquireHostResource(nearestInstance, fiber.memoizedState);
								trackDebugInfoFromHostResource(nearestInstance, fiber);
							} else if (fiber.tag === HostComponent || fiber.tag === HostText || fiber.tag === HostSingleton) {
								const nearestInstance = reconcilingParent;
								if (nearestInstance === null) throw new Error("Did not expect a host hoistable to be the root");
								aquireHostInstance(nearestInstance, fiber.stateNode);
								trackDebugInfoFromHostComponent(nearestInstance, fiber);
							}
							if (isSuspendedOffscreen(fiber)) {
								const stashedDisconnected = isInDisconnectedSubtree;
								isInDisconnectedSubtree = true;
								try {
									if (fiber.child !== null) mountChildrenRecursively(fiber.child, false);
								} finally {
									isInDisconnectedSubtree = stashedDisconnected;
								}
							} else if (isHiddenOffscreen(fiber)) {} else if (fiber.tag === SuspenseComponent && OffscreenComponent === -1) {
								if (newSuspenseNode !== null) trackThrownPromisesFromRetryCache(newSuspenseNode, fiber.stateNode);
								if (fiber.memoizedState !== null) {
									const primaryChildFragment = fiber.child;
									const fallbackChildFragment = primaryChildFragment ? primaryChildFragment.sibling : null;
									if (fallbackChildFragment) {
										const fallbackChild = fallbackChildFragment.child;
										if (fallbackChild !== null) {
											updateTrackedPathStateBeforeMount(fallbackChildFragment, null);
											mountChildrenRecursively(fallbackChild, traceNearestHostComponentUpdate);
										}
									}
								} else {
									const primaryChild = fiber.child;
									if (primaryChild !== null) mountChildrenRecursively(primaryChild, traceNearestHostComponentUpdate);
								}
							} else if (fiber.tag === SuspenseComponent && OffscreenComponent !== -1 && newInstance !== null && newSuspenseNode !== null) {
								const contentFiber = fiber.child;
								if (isFiberHydrated(fiber)) {
									if (contentFiber === null) throw new Error("There should always be an Offscreen Fiber child in a hydrated Suspense boundary.");
									trackThrownPromisesFromRetryCache(newSuspenseNode, fiber.stateNode);
									mountSuspenseChildrenRecursively(contentFiber, traceNearestHostComponentUpdate, stashedSuspenseParent, stashedSuspensePrevious, stashedSuspenseRemaining);
									shouldPopSuspenseNode = false;
								}
							} else if (fiber.child !== null) mountChildrenRecursively(fiber.child, traceNearestHostComponentUpdate);
						} finally {
							if (newInstance !== null) {
								reconcilingParent = stashedParent;
								previouslyReconciledSibling = stashedPrevious;
								remainingReconcilingChildren = stashedRemaining;
							}
							if (shouldPopSuspenseNode) {
								reconcilingParentSuspenseNode = stashedSuspenseParent;
								previouslyReconciledSiblingSuspenseNode = stashedSuspensePrevious;
								remainingReconcilingChildrenSuspenseNodes = stashedSuspenseRemaining;
							}
						}
						updateTrackedPathStateAfterMount(mightSiblingsBeOnTrackedPath);
					}
					function unmountInstanceRecursively(instance) {
						let shouldPopSuspenseNode = false;
						const stashedParent = reconcilingParent;
						const stashedPrevious = previouslyReconciledSibling;
						const stashedRemaining = remainingReconcilingChildren;
						const stashedSuspenseParent = reconcilingParentSuspenseNode;
						const stashedSuspensePrevious = previouslyReconciledSiblingSuspenseNode;
						const stashedSuspenseRemaining = remainingReconcilingChildrenSuspenseNodes;
						const previousSuspendedBy = instance.suspendedBy;
						reconcilingParent = instance;
						previouslyReconciledSibling = null;
						remainingReconcilingChildren = instance.firstChild;
						instance.firstChild = null;
						instance.suspendedBy = null;
						if (instance.suspenseNode !== null) {
							reconcilingParentSuspenseNode = instance.suspenseNode;
							previouslyReconciledSiblingSuspenseNode = null;
							remainingReconcilingChildrenSuspenseNodes = instance.suspenseNode.firstChild;
							shouldPopSuspenseNode = true;
						}
						try {
							if ((instance.kind === FIBER_INSTANCE || instance.kind === FILTERED_FIBER_INSTANCE) && instance.data.tag === SuspenseComponent && OffscreenComponent !== -1) {
								const fiber = instance.data;
								const contentFiberInstance = remainingReconcilingChildren;
								if (isFiberHydrated(fiber)) {
									if (contentFiberInstance === null) throw new Error("There should always be an Offscreen Fiber child in a hydrated Suspense boundary.");
									unmountSuspenseChildrenRecursively(contentFiberInstance, stashedSuspenseParent, stashedSuspensePrevious, stashedSuspenseRemaining);
									shouldPopSuspenseNode = false;
								} else if (contentFiberInstance !== null) throw new Error("A dehydrated Suspense node should not have a content Fiber.");
							} else unmountRemainingChildren();
							removePreviousSuspendedBy(instance, previousSuspendedBy, reconcilingParentSuspenseNode);
						} finally {
							reconcilingParent = stashedParent;
							previouslyReconciledSibling = stashedPrevious;
							remainingReconcilingChildren = stashedRemaining;
							if (shouldPopSuspenseNode) {
								reconcilingParentSuspenseNode = stashedSuspenseParent;
								previouslyReconciledSiblingSuspenseNode = stashedSuspensePrevious;
								remainingReconcilingChildrenSuspenseNodes = stashedSuspenseRemaining;
							}
						}
						if (instance.kind === FIBER_INSTANCE) recordUnmount(instance);
						else if (instance.kind === VIRTUAL_INSTANCE) recordVirtualUnmount(instance);
						else untrackFiber(instance, instance.data);
						removeChild(instance, null);
					}
					function recordProfilingDurations(fiberInstance, prevFiber) {
						const id = fiberInstance.id;
						const fiber = fiberInstance.data;
						const { actualDuration, treeBaseDuration } = fiber;
						fiberInstance.treeBaseDuration = treeBaseDuration || 0;
						if (isProfiling) {
							if (prevFiber == null || treeBaseDuration !== prevFiber.treeBaseDuration) {
								const convertedTreeBaseDuration = Math.floor((treeBaseDuration || 0) * 1e3);
								pushOperation(TREE_OPERATION_UPDATE_TREE_BASE_DURATION);
								pushOperation(id);
								pushOperation(convertedTreeBaseDuration);
							}
							if (prevFiber == null || didFiberRender(prevFiber, fiber)) {
								if (actualDuration != null) {
									let selfDuration = actualDuration;
									let child = fiber.child;
									while (child !== null) {
										selfDuration -= child.actualDuration || 0;
										child = child.sibling;
									}
									const metadata = currentCommitProfilingMetadata;
									metadata.durations.push(id, actualDuration, selfDuration);
									metadata.maxActualDuration = Math.max(metadata.maxActualDuration, actualDuration);
									if (recordChangeDescriptions) {
										const changeDescription = getChangeDescription(prevFiber, fiber);
										if (changeDescription !== null) {
											if (metadata.changeDescriptions !== null) metadata.changeDescriptions.set(id, changeDescription);
										}
									}
								}
							}
							const updaters = currentRoot.data.stateNode.memoizedUpdaters;
							if (updaters != null && (updaters.has(fiber) || fiber.alternate !== null && updaters.has(fiber.alternate))) {
								const metadata = currentCommitProfilingMetadata;
								if (metadata.updaters === null) metadata.updaters = [];
								metadata.updaters.push(instanceToSerializedElement(fiberInstance));
							}
						}
					}
					function recordVirtualProfilingDurations(virtualInstance) {
						const id = virtualInstance.id;
						let treeBaseDuration = 0;
						for (let child = virtualInstance.firstChild; child !== null; child = child.nextSibling) treeBaseDuration += child.treeBaseDuration;
						if (isProfiling) {
							const previousTreeBaseDuration = virtualInstance.treeBaseDuration;
							if (treeBaseDuration !== previousTreeBaseDuration) {
								const convertedTreeBaseDuration = Math.floor((treeBaseDuration || 0) * 1e3);
								pushOperation(TREE_OPERATION_UPDATE_TREE_BASE_DURATION);
								pushOperation(id);
								pushOperation(convertedTreeBaseDuration);
							}
						}
						virtualInstance.treeBaseDuration = treeBaseDuration;
					}
					function addUnfilteredChildrenIDs(parentInstance, nextChildren) {
						let child = parentInstance.firstChild;
						while (child !== null) {
							if (child.kind === FILTERED_FIBER_INSTANCE) {
								const fiber = child.data;
								if (isHiddenOffscreen(fiber)) {} else addUnfilteredChildrenIDs(child, nextChildren);
							} else nextChildren.push(child.id);
							child = child.nextSibling;
						}
					}
					function recordResetChildren(parentInstance) {
						const nextChildren = [];
						addUnfilteredChildrenIDs(parentInstance, nextChildren);
						const numChildren = nextChildren.length;
						if (numChildren < 2) return;
						pushOperation(TREE_OPERATION_REORDER_CHILDREN);
						pushOperation(parentInstance.id);
						pushOperation(numChildren);
						for (let i = 0; i < nextChildren.length; i++) pushOperation(nextChildren[i]);
					}
					function addUnfilteredSuspenseChildrenIDs(parentInstance, nextChildren) {
						let child = parentInstance.firstChild;
						while (child !== null) {
							if (child.instance.kind === FILTERED_FIBER_INSTANCE) addUnfilteredSuspenseChildrenIDs(child, nextChildren);
							else nextChildren.push(child.instance.id);
							child = child.nextSibling;
						}
					}
					function recordResetSuspenseChildren(parentInstance) {
						const nextChildren = [];
						addUnfilteredSuspenseChildrenIDs(parentInstance, nextChildren);
						const numChildren = nextChildren.length;
						if (numChildren < 2) return;
						pushOperation(SUSPENSE_TREE_OPERATION_REORDER_CHILDREN);
						pushOperation(parentInstance.instance.id);
						pushOperation(numChildren);
						for (let i = 0; i < nextChildren.length; i++) pushOperation(nextChildren[i]);
					}
					function updateVirtualInstanceRecursively(virtualInstance, nextFirstChild, nextLastChild, prevFirstChild, traceNearestHostComponentUpdate, virtualLevel) {
						const stashedParent = reconcilingParent;
						const stashedPrevious = previouslyReconciledSibling;
						const stashedRemaining = remainingReconcilingChildren;
						const previousSuspendedBy = virtualInstance.suspendedBy;
						reconcilingParent = virtualInstance;
						previouslyReconciledSibling = null;
						remainingReconcilingChildren = virtualInstance.firstChild;
						virtualInstance.firstChild = null;
						virtualInstance.suspendedBy = null;
						try {
							let updateFlags = updateVirtualChildrenRecursively(nextFirstChild, nextLastChild, prevFirstChild, traceNearestHostComponentUpdate, virtualLevel + 1);
							if ((updateFlags & ShouldResetChildren) !== NoUpdate) {
								if (!isInDisconnectedSubtree) recordResetChildren(virtualInstance);
								updateFlags &= ~ShouldResetChildren;
							}
							removePreviousSuspendedBy(virtualInstance, previousSuspendedBy, reconcilingParentSuspenseNode);
							recordConsoleLogs(virtualInstance, componentInfoToComponentLogsMap.get(virtualInstance.data));
							recordVirtualProfilingDurations(virtualInstance);
							return updateFlags;
						} finally {
							unmountRemainingChildren();
							reconcilingParent = stashedParent;
							previouslyReconciledSibling = stashedPrevious;
							remainingReconcilingChildren = stashedRemaining;
						}
					}
					function updateVirtualChildrenRecursively(nextFirstChild, nextLastChild, prevFirstChild, traceNearestHostComponentUpdate, virtualLevel) {
						let updateFlags = NoUpdate;
						let nextChild = nextFirstChild;
						let prevChildAtSameIndex = prevFirstChild;
						let previousVirtualInstance = null;
						let previousVirtualInstanceWasMount = false;
						let previousVirtualInstanceNextFirstFiber = nextFirstChild;
						let previousVirtualInstancePrevFirstFiber = prevFirstChild;
						while (nextChild !== null && nextChild !== nextLastChild) {
							let level = 0;
							if (nextChild._debugInfo) for (let i = 0; i < nextChild._debugInfo.length; i++) {
								const debugEntry = nextChild._debugInfo[i];
								if (debugEntry.awaited) {
									const asyncInfo = debugEntry;
									if (level === virtualLevel) insertSuspendedBy(asyncInfo);
									continue;
								}
								if (typeof debugEntry.name !== "string") continue;
								const componentInfo = debugEntry;
								const secondaryEnv = getSecondaryEnvironmentName(nextChild._debugInfo, i);
								if (componentInfo.env != null) knownEnvironmentNames.add(componentInfo.env);
								if (secondaryEnv !== null) knownEnvironmentNames.add(secondaryEnv);
								if (shouldFilterVirtual(componentInfo, secondaryEnv)) continue;
								if (level === virtualLevel) {
									if (previousVirtualInstance === null || previousVirtualInstance.data !== componentInfo) {
										if (previousVirtualInstance !== null) if (previousVirtualInstanceWasMount) {
											mountVirtualInstanceRecursively(previousVirtualInstance, previousVirtualInstanceNextFirstFiber, nextChild, traceNearestHostComponentUpdate, virtualLevel);
											updateFlags |= ShouldResetChildren | ShouldResetSuspenseChildren;
										} else updateFlags |= updateVirtualInstanceRecursively(previousVirtualInstance, previousVirtualInstanceNextFirstFiber, nextChild, previousVirtualInstancePrevFirstFiber, traceNearestHostComponentUpdate, virtualLevel);
										let previousSiblingOfBestMatch = null;
										let bestMatch = remainingReconcilingChildren;
										if (componentInfo.key != null) {
											bestMatch = remainingReconcilingChildren;
											while (bestMatch !== null) {
												if (bestMatch.kind === VIRTUAL_INSTANCE && bestMatch.data.key === componentInfo.key) break;
												previousSiblingOfBestMatch = bestMatch;
												bestMatch = bestMatch.nextSibling;
											}
										}
										if (bestMatch !== null && bestMatch.kind === VIRTUAL_INSTANCE && bestMatch.data.name === componentInfo.name && bestMatch.data.env === componentInfo.env && bestMatch.data.key === componentInfo.key) {
											bestMatch.data = componentInfo;
											moveChild(bestMatch, previousSiblingOfBestMatch);
											previousVirtualInstance = bestMatch;
											previousVirtualInstanceWasMount = false;
										} else {
											const newVirtualInstance = createVirtualInstance(componentInfo);
											recordVirtualMount(newVirtualInstance, reconcilingParent, secondaryEnv);
											insertChild(newVirtualInstance);
											previousVirtualInstance = newVirtualInstance;
											previousVirtualInstanceWasMount = true;
											updateFlags |= ShouldResetChildren;
										}
										previousVirtualInstanceNextFirstFiber = nextChild;
										previousVirtualInstancePrevFirstFiber = prevChildAtSameIndex;
									}
									level++;
									break;
								} else level++;
							}
							if (level === virtualLevel) {
								if (previousVirtualInstance !== null) {
									if (previousVirtualInstanceWasMount) {
										mountVirtualInstanceRecursively(previousVirtualInstance, previousVirtualInstanceNextFirstFiber, nextChild, traceNearestHostComponentUpdate, virtualLevel);
										updateFlags |= ShouldResetChildren | ShouldResetSuspenseChildren;
									} else updateFlags |= updateVirtualInstanceRecursively(previousVirtualInstance, previousVirtualInstanceNextFirstFiber, nextChild, previousVirtualInstancePrevFirstFiber, traceNearestHostComponentUpdate, virtualLevel);
									previousVirtualInstance = null;
								}
								let prevChild;
								if (prevChildAtSameIndex === nextChild) prevChild = nextChild;
								else prevChild = nextChild.alternate;
								let previousSiblingOfExistingInstance = null;
								let existingInstance = null;
								if (prevChild !== null) {
									existingInstance = remainingReconcilingChildren;
									while (existingInstance !== null) {
										if (existingInstance.data === prevChild) break;
										previousSiblingOfExistingInstance = existingInstance;
										existingInstance = existingInstance.nextSibling;
									}
								}
								if (existingInstance !== null) {
									const fiberInstance = existingInstance;
									if (prevChild !== prevChildAtSameIndex) updateFlags |= ShouldResetChildren | ShouldResetSuspenseChildren;
									moveChild(fiberInstance, previousSiblingOfExistingInstance);
									updateFlags |= updateFiberRecursively(fiberInstance, nextChild, prevChild, traceNearestHostComponentUpdate);
								} else if (prevChild !== null && shouldFilterFiber(nextChild)) {
									if (prevChild !== prevChildAtSameIndex) updateFlags |= ShouldResetChildren | ShouldResetSuspenseChildren;
									updateFlags |= updateFiberRecursively(null, nextChild, prevChild, traceNearestHostComponentUpdate);
								} else {
									mountFiberRecursively(nextChild, traceNearestHostComponentUpdate);
									updateFlags |= ShouldResetChildren | ShouldResetSuspenseChildren;
								}
							}
							nextChild = nextChild.sibling;
							if ((updateFlags & ShouldResetChildren) === NoUpdate && prevChildAtSameIndex !== null) prevChildAtSameIndex = prevChildAtSameIndex.sibling;
						}
						if (previousVirtualInstance !== null) if (previousVirtualInstanceWasMount) {
							mountVirtualInstanceRecursively(previousVirtualInstance, previousVirtualInstanceNextFirstFiber, null, traceNearestHostComponentUpdate, virtualLevel);
							updateFlags |= ShouldResetChildren | ShouldResetSuspenseChildren;
						} else updateFlags |= updateVirtualInstanceRecursively(previousVirtualInstance, previousVirtualInstanceNextFirstFiber, null, previousVirtualInstancePrevFirstFiber, traceNearestHostComponentUpdate, virtualLevel);
						if (prevChildAtSameIndex !== null) updateFlags |= ShouldResetChildren | ShouldResetSuspenseChildren;
						return updateFlags;
					}
					function updateChildrenRecursively(nextFirstChild, prevFirstChild, traceNearestHostComponentUpdate) {
						if (nextFirstChild === null) return prevFirstChild !== null ? ShouldResetChildren : NoUpdate;
						return updateVirtualChildrenRecursively(nextFirstChild, null, prevFirstChild, traceNearestHostComponentUpdate, 0);
					}
					function updateSuspenseChildrenRecursively(nextContentFiber, prevContentFiber, traceNearestHostComponentUpdate, stashedSuspenseParent, stashedSuspensePrevious, stashedSuspenseRemaining) {
						let updateFlags = NoUpdate;
						const prevFallbackFiber = prevContentFiber.sibling;
						const nextFallbackFiber = nextContentFiber.sibling;
						updateFlags |= updateVirtualChildrenRecursively(nextContentFiber, nextFallbackFiber, prevContentFiber, traceNearestHostComponentUpdate, 0);
						reconcilingParentSuspenseNode = stashedSuspenseParent;
						previouslyReconciledSiblingSuspenseNode = stashedSuspensePrevious;
						remainingReconcilingChildrenSuspenseNodes = stashedSuspenseRemaining;
						if (prevFallbackFiber !== null || nextFallbackFiber !== null) if (nextFallbackFiber === null) unmountRemainingChildren();
						else {
							updateFlags |= updateVirtualChildrenRecursively(nextFallbackFiber, null, prevFallbackFiber, traceNearestHostComponentUpdate, 0);
							if ((updateFlags & ShouldResetSuspenseChildren) !== NoUpdate) {
								updateFlags |= ShouldResetParentSuspenseChildren;
								updateFlags &= ~ShouldResetSuspenseChildren;
							}
						}
						return updateFlags;
					}
					function updateFiberRecursively(fiberInstance, nextFiber, prevFiber, traceNearestHostComponentUpdate) {
						if (traceUpdatesEnabled) {
							const elementType = getElementTypeForFiber(nextFiber);
							if (traceNearestHostComponentUpdate) {
								if (elementType === ElementTypeHostComponent) {
									traceUpdatesForNodes.add(nextFiber.stateNode);
									traceNearestHostComponentUpdate = false;
								}
							} else if (elementType === types_ElementTypeFunction || elementType === types_ElementTypeClass || elementType === ElementTypeContext || elementType === types_ElementTypeMemo || elementType === types_ElementTypeForwardRef) traceNearestHostComponentUpdate = didFiberRender(prevFiber, nextFiber);
						}
						const stashedParent = reconcilingParent;
						const stashedPrevious = previouslyReconciledSibling;
						const stashedRemaining = remainingReconcilingChildren;
						const stashedSuspenseParent = reconcilingParentSuspenseNode;
						const stashedSuspensePrevious = previouslyReconciledSiblingSuspenseNode;
						const stashedSuspenseRemaining = remainingReconcilingChildrenSuspenseNodes;
						let updateFlags = NoUpdate;
						let shouldMeasureSuspenseNode = false;
						let shouldPopSuspenseNode = false;
						let previousSuspendedBy = null;
						if (fiberInstance !== null) {
							previousSuspendedBy = fiberInstance.suspendedBy;
							fiberInstance.data = nextFiber;
							if (mostRecentlyInspectedElement !== null && (mostRecentlyInspectedElement.id === fiberInstance.id || mostRecentlyInspectedElement.type === ElementTypeRoot && nextFiber.tag === HostRoot) && didFiberRender(prevFiber, nextFiber)) hasElementUpdatedSinceLastInspected = true;
							reconcilingParent = fiberInstance;
							previouslyReconciledSibling = null;
							remainingReconcilingChildren = fiberInstance.firstChild;
							fiberInstance.firstChild = null;
							fiberInstance.suspendedBy = null;
							const suspenseNode = fiberInstance.suspenseNode;
							if (suspenseNode !== null) {
								reconcilingParentSuspenseNode = suspenseNode;
								previouslyReconciledSiblingSuspenseNode = null;
								remainingReconcilingChildrenSuspenseNodes = suspenseNode.firstChild;
								suspenseNode.firstChild = null;
								shouldMeasureSuspenseNode = true;
								shouldPopSuspenseNode = true;
							}
						}
						try {
							trackDebugInfoFromLazyType(nextFiber);
							trackDebugInfoFromUsedThenables(nextFiber);
							if (nextFiber.tag === HostHoistable) {
								const nearestInstance = reconcilingParent;
								if (nearestInstance === null) throw new Error("Did not expect a host hoistable to be the root");
								if (prevFiber.memoizedState !== nextFiber.memoizedState) {
									releaseHostResource(nearestInstance, prevFiber.memoizedState);
									aquireHostResource(nearestInstance, nextFiber.memoizedState);
								}
								trackDebugInfoFromHostResource(nearestInstance, nextFiber);
							} else if (nextFiber.tag === HostComponent || nextFiber.tag === HostText || nextFiber.tag === HostSingleton) {
								const nearestInstance = reconcilingParent;
								if (nearestInstance === null) throw new Error("Did not expect a host hoistable to be the root");
								if (prevFiber.stateNode !== nextFiber.stateNode) {
									releaseHostInstance(nearestInstance, prevFiber.stateNode);
									aquireHostInstance(nearestInstance, nextFiber.stateNode);
								}
								trackDebugInfoFromHostComponent(nearestInstance, nextFiber);
							}
							const isLegacySuspense = nextFiber.tag === SuspenseComponent && OffscreenComponent === -1;
							const prevDidTimeout = isLegacySuspense && prevFiber.memoizedState !== null;
							const nextDidTimeOut = isLegacySuspense && nextFiber.memoizedState !== null;
							const prevWasHidden = isHiddenOffscreen(prevFiber);
							const nextIsHidden = isHiddenOffscreen(nextFiber);
							const prevWasSuspended = isSuspendedOffscreen(prevFiber);
							const nextIsSuspended = isSuspendedOffscreen(nextFiber);
							if (isLegacySuspense) {
								if (fiberInstance !== null && fiberInstance.suspenseNode !== null) {
									const suspenseNode = fiberInstance.suspenseNode;
									if (prevFiber.stateNode === null !== (nextFiber.stateNode === null)) trackThrownPromisesFromRetryCache(suspenseNode, nextFiber.stateNode);
									if (prevFiber.memoizedState === null !== (nextFiber.memoizedState === null)) recordSuspenseSuspenders(suspenseNode);
								}
							}
							if (prevDidTimeout && nextDidTimeOut) {
								const nextFiberChild = nextFiber.child;
								const nextFallbackChildSet = nextFiberChild ? nextFiberChild.sibling : null;
								const prevFiberChild = prevFiber.child;
								const prevFallbackChildSet = prevFiberChild ? prevFiberChild.sibling : null;
								if (prevFallbackChildSet == null && nextFallbackChildSet != null) {
									mountChildrenRecursively(nextFallbackChildSet, traceNearestHostComponentUpdate);
									updateFlags |= ShouldResetChildren | ShouldResetSuspenseChildren;
								}
								const childrenUpdateFlags = nextFallbackChildSet != null && prevFallbackChildSet != null ? updateChildrenRecursively(nextFallbackChildSet, prevFallbackChildSet, traceNearestHostComponentUpdate) : NoUpdate;
								updateFlags |= childrenUpdateFlags;
							} else if (prevDidTimeout && !nextDidTimeOut) {
								const nextPrimaryChildSet = nextFiber.child;
								if (nextPrimaryChildSet !== null) {
									mountChildrenRecursively(nextPrimaryChildSet, traceNearestHostComponentUpdate);
									updateFlags |= ShouldResetChildren | ShouldResetSuspenseChildren;
								}
							} else if (!prevDidTimeout && nextDidTimeOut) {
								const nextFiberChild = nextFiber.child;
								const nextFallbackChildSet = nextFiberChild ? nextFiberChild.sibling : null;
								if (nextFallbackChildSet != null) {
									mountChildrenRecursively(nextFallbackChildSet, traceNearestHostComponentUpdate);
									updateFlags |= ShouldResetChildren | ShouldResetSuspenseChildren;
								}
							} else if (nextIsSuspended) {
								if (!prevWasSuspended) {
									if (fiberInstance !== null && !isInDisconnectedSubtree) disconnectChildrenRecursively(remainingReconcilingChildren);
								}
								const stashedDisconnected = isInDisconnectedSubtree;
								isInDisconnectedSubtree = true;
								try {
									updateFlags |= updateChildrenRecursively(nextFiber.child, prevFiber.child, false);
								} finally {
									isInDisconnectedSubtree = stashedDisconnected;
								}
							} else if (prevWasSuspended && !nextIsSuspended) {
								const stashedDisconnected = isInDisconnectedSubtree;
								isInDisconnectedSubtree = true;
								try {
									if (nextFiber.child !== null) updateFlags |= updateChildrenRecursively(nextFiber.child, prevFiber.child, false);
									unmountRemainingChildren();
									remainingReconcilingChildren = null;
								} finally {
									isInDisconnectedSubtree = stashedDisconnected;
								}
								if (fiberInstance !== null && !isInDisconnectedSubtree) {
									reconnectChildrenRecursively(fiberInstance);
									updateFlags |= ShouldResetChildren | ShouldResetSuspenseChildren;
								}
							} else if (nextIsHidden) if (prevWasHidden) {} else unmountRemainingChildren();
							else if (nextFiber.tag === SuspenseComponent && OffscreenComponent !== -1 && fiberInstance !== null && fiberInstance.suspenseNode !== null) {
								const suspenseNode = fiberInstance.suspenseNode;
								const prevContentFiber = prevFiber.child;
								const nextContentFiber = nextFiber.child;
								const previousHydrated = isFiberHydrated(prevFiber);
								const nextHydrated = isFiberHydrated(nextFiber);
								if (previousHydrated && nextHydrated) {
									if (nextContentFiber === null || prevContentFiber === null) throw new Error("There should always be an Offscreen Fiber child in a hydrated Suspense boundary.");
									if (prevFiber.stateNode === null !== (nextFiber.stateNode === null)) trackThrownPromisesFromRetryCache(suspenseNode, nextFiber.stateNode);
									if (prevFiber.memoizedState === null !== (nextFiber.memoizedState === null)) recordSuspenseSuspenders(suspenseNode);
									shouldMeasureSuspenseNode = false;
									updateFlags |= updateSuspenseChildrenRecursively(nextContentFiber, prevContentFiber, traceNearestHostComponentUpdate, stashedSuspenseParent, stashedSuspensePrevious, stashedSuspenseRemaining);
									shouldPopSuspenseNode = false;
									if (nextFiber.memoizedState === null) shouldMeasureSuspenseNode = !isInDisconnectedSubtree;
								} else if (!previousHydrated && nextHydrated) {
									if (nextContentFiber === null) throw new Error("There should always be an Offscreen Fiber child in a hydrated Suspense boundary.");
									trackThrownPromisesFromRetryCache(suspenseNode, nextFiber.stateNode);
									recordSuspenseSuspenders(suspenseNode);
									mountSuspenseChildrenRecursively(nextContentFiber, traceNearestHostComponentUpdate, stashedSuspenseParent, stashedSuspensePrevious, stashedSuspenseRemaining);
									shouldPopSuspenseNode = false;
								} else if (previousHydrated && !nextHydrated) throw new Error("Encountered a dehydrated Suspense boundary that was previously hydrated.");
							} else if (nextFiber.child !== prevFiber.child) updateFlags |= updateChildrenRecursively(nextFiber.child, prevFiber.child, traceNearestHostComponentUpdate);
							else if (fiberInstance !== null) {
								fiberInstance.firstChild = remainingReconcilingChildren;
								remainingReconcilingChildren = null;
								consumeSuspenseNodesOfExistingInstance(fiberInstance);
								if (traceUpdatesEnabled) {
									if (traceNearestHostComponentUpdate) findAllCurrentHostInstances(fiberInstance).forEach((hostInstance) => {
										traceUpdatesForNodes.add(hostInstance);
									});
								}
							} else {
								const childrenUpdateFlags = updateChildrenRecursively(nextFiber.child, prevFiber.child, false);
								if ((childrenUpdateFlags & ShouldResetChildren) !== NoUpdate) throw new Error("The children should not have changed if we pass in the same set.");
								updateFlags |= childrenUpdateFlags;
							}
							if (fiberInstance !== null) {
								removePreviousSuspendedBy(fiberInstance, previousSuspendedBy, shouldPopSuspenseNode ? reconcilingParentSuspenseNode : stashedSuspenseParent);
								if (fiberInstance.kind === FIBER_INSTANCE) {
									let componentLogsEntry = fiberToComponentLogsMap.get(fiberInstance.data);
									if (componentLogsEntry === void 0 && fiberInstance.data.alternate) componentLogsEntry = fiberToComponentLogsMap.get(fiberInstance.data.alternate);
									recordConsoleLogs(fiberInstance, componentLogsEntry);
									if (nextFiber.hasOwnProperty("treeBaseDuration")) recordProfilingDurations(fiberInstance, prevFiber);
								}
							}
							if ((updateFlags & ShouldResetChildren) !== NoUpdate) {
								if (fiberInstance !== null && fiberInstance.kind === FIBER_INSTANCE) {
									if (!nextIsSuspended && !isInDisconnectedSubtree) recordResetChildren(fiberInstance);
									updateFlags &= ~ShouldResetChildren;
								}
							}
							if ((updateFlags & ShouldResetSuspenseChildren) !== NoUpdate) {
								if (fiberInstance !== null && fiberInstance.kind === FIBER_INSTANCE) {
									const suspenseNode = fiberInstance.suspenseNode;
									if (suspenseNode !== null) {
										recordResetSuspenseChildren(suspenseNode);
										updateFlags &= ~ShouldResetSuspenseChildren;
									}
								}
							}
							if ((updateFlags & ShouldResetParentSuspenseChildren) !== NoUpdate) {
								if (fiberInstance !== null && fiberInstance.kind === FIBER_INSTANCE) {
									if (fiberInstance.suspenseNode !== null) {
										updateFlags &= ~ShouldResetParentSuspenseChildren;
										updateFlags |= ShouldResetSuspenseChildren;
									}
								}
							}
							return updateFlags;
						} finally {
							if (fiberInstance !== null) {
								unmountRemainingChildren();
								reconcilingParent = stashedParent;
								previouslyReconciledSibling = stashedPrevious;
								remainingReconcilingChildren = stashedRemaining;
								if (shouldMeasureSuspenseNode) {
									if (!isInDisconnectedSubtree) {
										const suspenseNode = fiberInstance.suspenseNode;
										if (suspenseNode === null) throw new Error("Attempted to measure a Suspense node that does not exist.");
										const prevRects = suspenseNode.rects;
										const nextRects = measureInstance(fiberInstance);
										if (!areEqualRects(prevRects, nextRects)) {
											suspenseNode.rects = nextRects;
											recordSuspenseResize(suspenseNode);
										}
									}
								}
								if (shouldPopSuspenseNode) {
									reconcilingParentSuspenseNode = stashedSuspenseParent;
									previouslyReconciledSiblingSuspenseNode = stashedSuspensePrevious;
									remainingReconcilingChildrenSuspenseNodes = stashedSuspenseRemaining;
								}
							}
						}
					}
					function disconnectChildrenRecursively(firstChild) {
						for (let child = firstChild; child !== null; child = child.nextSibling) {
							if ((child.kind === FIBER_INSTANCE || child.kind === FILTERED_FIBER_INSTANCE) && isSuspendedOffscreen(child.data)) {} else disconnectChildrenRecursively(child.firstChild);
							if (child.kind === FIBER_INSTANCE) recordDisconnect(child);
							else if (child.kind === VIRTUAL_INSTANCE) recordVirtualDisconnect(child);
						}
					}
					function reconnectChildrenRecursively(parentInstance) {
						for (let child = parentInstance.firstChild; child !== null; child = child.nextSibling) {
							if (child.kind === FIBER_INSTANCE) recordReconnect(child, parentInstance);
							else if (child.kind === VIRTUAL_INSTANCE) recordVirtualReconnect(child, parentInstance, null);
							if ((child.kind === FIBER_INSTANCE || child.kind === FILTERED_FIBER_INSTANCE) && isHiddenOffscreen(child.data)) {} else reconnectChildrenRecursively(child);
						}
					}
					function cleanup() {
						isProfiling = false;
					}
					function rootSupportsProfiling(root) {
						if (root.memoizedInteractions != null) return true;
						else if (root.current != null && root.current.hasOwnProperty("treeBaseDuration")) return true;
						else return false;
					}
					function flushInitialOperations() {
						const localPendingOperationsQueue = pendingOperationsQueue;
						pendingOperationsQueue = null;
						if (localPendingOperationsQueue !== null && localPendingOperationsQueue.length > 0) localPendingOperationsQueue.forEach((operations) => {
							hook.emit("operations", operations);
						});
						else {
							if (trackedPath !== null) mightBeOnTrackedPath = true;
							hook.getFiberRoots(rendererID).forEach((root) => {
								const current = root.current;
								const newRoot = createFiberInstance(current);
								rootToFiberInstanceMap.set(root, newRoot);
								idToDevToolsInstanceMap.set(newRoot.id, newRoot);
								currentRoot = newRoot;
								setRootPseudoKey(currentRoot.id, root.current);
								if (isProfiling && rootSupportsProfiling(root)) currentCommitProfilingMetadata = {
									changeDescriptions: recordChangeDescriptions ? /* @__PURE__ */ new Map() : null,
									durations: [],
									commitTime: renderer_getCurrentTime() - profilingStartTime,
									maxActualDuration: 0,
									priorityLevel: null,
									updaters: null,
									effectDuration: null,
									passiveEffectDuration: null
								};
								mountFiberRecursively(root.current, false);
								flushPendingEvents();
								needsToFlushComponentLogs = false;
								currentRoot = null;
							});
						}
					}
					function handleCommitFiberUnmount(fiber) {}
					function handlePostCommitFiberRoot(root) {
						if (isProfiling && rootSupportsProfiling(root)) {
							if (currentCommitProfilingMetadata !== null) {
								const { effectDuration, passiveEffectDuration } = getEffectDurations(root);
								currentCommitProfilingMetadata.effectDuration = effectDuration;
								currentCommitProfilingMetadata.passiveEffectDuration = passiveEffectDuration;
							}
						}
						if (needsToFlushComponentLogs) bruteForceFlushErrorsAndWarnings();
					}
					function handleCommitFiberRoot(root, priorityLevel) {
						const nextFiber = root.current;
						let prevFiber = null;
						let rootInstance = rootToFiberInstanceMap.get(root);
						if (!rootInstance) {
							rootInstance = createFiberInstance(nextFiber);
							rootToFiberInstanceMap.set(root, rootInstance);
							idToDevToolsInstanceMap.set(rootInstance.id, rootInstance);
						} else prevFiber = rootInstance.data;
						currentRoot = rootInstance;
						if (trackedPath !== null) mightBeOnTrackedPath = true;
						if (traceUpdatesEnabled) traceUpdatesForNodes.clear();
						const isProfilingSupported = rootSupportsProfiling(root);
						if (isProfiling && isProfilingSupported) currentCommitProfilingMetadata = {
							changeDescriptions: recordChangeDescriptions ? /* @__PURE__ */ new Map() : null,
							durations: [],
							commitTime: renderer_getCurrentTime() - profilingStartTime,
							maxActualDuration: 0,
							priorityLevel: priorityLevel == null ? null : formatPriorityLevel(priorityLevel),
							updaters: null,
							effectDuration: null,
							passiveEffectDuration: null
						};
						const nextIsMounted = nextFiber.child !== null;
						const prevWasMounted = prevFiber !== null && prevFiber.child !== null;
						if (!prevWasMounted && nextIsMounted) {
							setRootPseudoKey(currentRoot.id, nextFiber);
							mountFiberRecursively(nextFiber, false);
						} else if (prevWasMounted && nextIsMounted) {
							if (prevFiber === null) throw new Error("Expected a previous Fiber when updating an existing root.");
							updateFiberRecursively(rootInstance, nextFiber, prevFiber, false);
						} else if (prevWasMounted && !nextIsMounted) {
							unmountInstanceRecursively(rootInstance);
							removeRootPseudoKey(currentRoot.id);
							rootToFiberInstanceMap.delete(root);
						} else if (!prevWasMounted && !nextIsMounted) rootToFiberInstanceMap.delete(root);
						if (isProfiling && isProfilingSupported) {
							if (!shouldBailoutWithPendingOperations()) {
								const commitProfilingMetadata = rootToCommitProfilingMetadataMap.get(currentRoot.id);
								if (commitProfilingMetadata != null) commitProfilingMetadata.push(currentCommitProfilingMetadata);
								else rootToCommitProfilingMetadataMap.set(currentRoot.id, [currentCommitProfilingMetadata]);
							}
						}
						flushPendingEvents();
						needsToFlushComponentLogs = false;
						if (traceUpdatesEnabled) hook.emit("traceUpdates", traceUpdatesForNodes);
						currentRoot = null;
					}
					function getResourceInstance(fiber) {
						if (fiber.tag === HostHoistable) {
							const resource = fiber.memoizedState;
							if (typeof resource === "object" && resource !== null && resource.instance != null) return resource.instance;
						}
						return null;
					}
					function appendHostInstancesByDevToolsInstance(devtoolsInstance, hostInstances) {
						if (devtoolsInstance.kind !== VIRTUAL_INSTANCE) {
							const fiber = devtoolsInstance.data;
							appendHostInstancesByFiber(fiber, hostInstances);
							return;
						}
						for (let child = devtoolsInstance.firstChild; child !== null; child = child.nextSibling) appendHostInstancesByDevToolsInstance(child, hostInstances);
					}
					function appendHostInstancesByFiber(fiber, hostInstances) {
						let node = fiber;
						while (true) {
							if (node.tag === HostComponent || node.tag === HostText || node.tag === HostSingleton || node.tag === HostHoistable) {
								const hostInstance = node.stateNode || getResourceInstance(node);
								if (hostInstance) hostInstances.push(hostInstance);
							} else if (node.child) {
								node.child.return = node;
								node = node.child;
								continue;
							}
							if (node === fiber) return;
							while (!node.sibling) {
								if (!node.return || node.return === fiber) return;
								node = node.return;
							}
							node.sibling.return = node.return;
							node = node.sibling;
						}
					}
					function findAllCurrentHostInstances(devtoolsInstance) {
						const hostInstances = [];
						appendHostInstancesByDevToolsInstance(devtoolsInstance, hostInstances);
						return hostInstances;
					}
					function findHostInstancesForElementID(id) {
						try {
							const devtoolsInstance = idToDevToolsInstanceMap.get(id);
							if (devtoolsInstance === void 0) {
								console.warn(`Could not find DevToolsInstance with id "${id}"`);
								return null;
							}
							return findAllCurrentHostInstances(devtoolsInstance);
						} catch (err) {
							return null;
						}
					}
					function findLastKnownRectsForID(id) {
						try {
							const devtoolsInstance = idToDevToolsInstanceMap.get(id);
							if (devtoolsInstance === void 0) {
								console.warn(`Could not find DevToolsInstance with id "${id}"`);
								return null;
							}
							if (devtoolsInstance.suspenseNode === null) return null;
							return devtoolsInstance.suspenseNode.rects;
						} catch (err) {
							return null;
						}
					}
					function getDisplayNameForElementID(id) {
						const devtoolsInstance = idToDevToolsInstanceMap.get(id);
						if (devtoolsInstance === void 0) return null;
						if (devtoolsInstance.kind === FIBER_INSTANCE) {
							const fiber = devtoolsInstance.data;
							if (fiber.tag === HostRoot) return "Initial Paint";
							if (fiber.tag === SuspenseComponent || fiber.tag === ActivityComponent) {
								const props = fiber.memoizedProps;
								if (props.name != null) return props.name;
								const owner = getUnfilteredOwner(fiber);
								if (owner != null) if (typeof owner.tag === "number") return getDisplayNameForFiber(owner);
								else return owner.name || "";
							}
							return getDisplayNameForFiber(fiber);
						} else return devtoolsInstance.data.name || "";
					}
					function getNearestSuspenseNode(instance) {
						while (instance.suspenseNode === null) {
							if (instance.parent === null) throw new Error("There should always be a SuspenseNode parent on a mounted instance.");
							instance = instance.parent;
						}
						return instance.suspenseNode;
					}
					function getNearestMountedDOMNode(publicInstance) {
						let domNode = publicInstance;
						while (domNode && !publicInstanceToDevToolsInstanceMap.has(domNode)) domNode = domNode.parentNode;
						return domNode;
					}
					function getElementIDForHostInstance(publicInstance) {
						const instance = publicInstanceToDevToolsInstanceMap.get(publicInstance);
						if (instance !== void 0) {
							if (instance.kind === FILTERED_FIBER_INSTANCE) return instance.parent.id;
							return instance.id;
						}
						return null;
					}
					function getSuspenseNodeIDForHostInstance(publicInstance) {
						const instance = publicInstanceToDevToolsInstanceMap.get(publicInstance);
						if (instance !== void 0) {
							let suspenseInstance = instance;
							while (suspenseInstance.suspenseNode === null || suspenseInstance.kind === FILTERED_FIBER_INSTANCE) {
								if (suspenseInstance.parent === null) return null;
								suspenseInstance = suspenseInstance.parent;
							}
							return suspenseInstance.id;
						}
						return null;
					}
					function getElementAttributeByPath(id, path) {
						if (isMostRecentlyInspectedElement(id)) return utils_getInObject(mostRecentlyInspectedElement, path);
					}
					function getElementSourceFunctionById(id) {
						const devtoolsInstance = idToDevToolsInstanceMap.get(id);
						if (devtoolsInstance === void 0) {
							console.warn(`Could not find DevToolsInstance with id "${id}"`);
							return null;
						}
						if (devtoolsInstance.kind !== FIBER_INSTANCE) return null;
						const { elementType, tag, type } = devtoolsInstance.data;
						switch (tag) {
							case ClassComponent:
							case IncompleteClassComponent:
							case IncompleteFunctionComponent:
							case IndeterminateComponent:
							case FunctionComponent: return type;
							case ForwardRef: return type.render;
							case MemoComponent:
							case SimpleMemoComponent: return elementType != null && elementType.type != null ? elementType.type : type;
							default: return null;
						}
					}
					function instanceToSerializedElement(instance) {
						if (instance.kind === FIBER_INSTANCE) {
							const fiber = instance.data;
							return {
								displayName: getDisplayNameForFiber(fiber) || "Anonymous",
								id: instance.id,
								key: fiber.key,
								env: null,
								stack: fiber._debugOwner == null || fiber._debugStack == null ? null : parseStackTrace(fiber._debugStack, 1),
								type: getElementTypeForFiber(fiber)
							};
						} else {
							const componentInfo = instance.data;
							return {
								displayName: componentInfo.name || "Anonymous",
								id: instance.id,
								key: componentInfo.key == null ? null : componentInfo.key,
								env: componentInfo.env == null ? null : componentInfo.env,
								stack: componentInfo.owner == null || componentInfo.debugStack == null ? null : parseStackTrace(componentInfo.debugStack, 1),
								type: types_ElementTypeVirtual
							};
						}
					}
					function getOwnersList(id) {
						const devtoolsInstance = idToDevToolsInstanceMap.get(id);
						if (devtoolsInstance === void 0) {
							console.warn(`Could not find DevToolsInstance with id "${id}"`);
							return null;
						}
						const self = instanceToSerializedElement(devtoolsInstance);
						const owners = getOwnersListFromInstance(devtoolsInstance);
						if (owners === null) return [self];
						owners.unshift(self);
						owners.reverse();
						return owners;
					}
					function getOwnersListFromInstance(instance) {
						let owner = getUnfilteredOwner(instance.data);
						if (owner === null) return null;
						const owners = [];
						let parentInstance = instance.parent;
						while (parentInstance !== null && owner !== null) {
							const ownerInstance = findNearestOwnerInstance(parentInstance, owner);
							if (ownerInstance !== null) {
								owners.push(instanceToSerializedElement(ownerInstance));
								owner = getUnfilteredOwner(owner);
								parentInstance = ownerInstance.parent;
							} else break;
						}
						return owners;
					}
					function getUnfilteredOwner(owner) {
						if (owner == null) return null;
						if (typeof owner.tag === "number") owner = owner._debugOwner;
						else owner = owner.owner;
						while (owner) if (typeof owner.tag === "number") {
							const ownerFiber = owner;
							if (!shouldFilterFiber(ownerFiber)) return ownerFiber;
							owner = ownerFiber._debugOwner;
						} else {
							const ownerInfo = owner;
							if (!shouldFilterVirtual(ownerInfo, null)) return ownerInfo;
							owner = ownerInfo.owner;
						}
						return null;
					}
					function findNearestOwnerInstance(parentInstance, owner) {
						if (owner == null) return null;
						while (parentInstance !== null) {
							if (parentInstance.data === owner || parentInstance.data === owner.alternate) {
								if (parentInstance.kind === FILTERED_FIBER_INSTANCE) return null;
								return parentInstance;
							}
							parentInstance = parentInstance.parent;
						}
						return null;
					}
					function inspectHooks(fiber) {
						const originalConsoleMethods = {};
						for (const method in console) try {
							originalConsoleMethods[method] = console[method];
							console[method] = () => {};
						} catch (error) {}
						try {
							return inspectHooksOfFiber(fiber, getDispatcherRef(renderer));
						} finally {
							for (const method in originalConsoleMethods) try {
								console[method] = originalConsoleMethods[method];
							} catch (error) {}
						}
					}
					function getSuspendedByOfSuspenseNode(suspenseNode, filterByChildInstance) {
						const result = [];
						if (!suspenseNode.hasUniqueSuspenders) return result;
						let hooksCacheKey = null;
						let hooksCache = null;
						const streamEntries = /* @__PURE__ */ new Map();
						suspenseNode.suspendedBy.forEach((set, ioInfo) => {
							let parentNode = suspenseNode.parent;
							while (parentNode !== null) {
								if (parentNode.suspendedBy.has(ioInfo)) return;
								parentNode = parentNode.parent;
							}
							if (set.size === 0) return;
							let firstInstance = null;
							if (filterByChildInstance === null) firstInstance = set.values().next().value;
							else for (const childInstance of set.values()) {
								if (firstInstance === null) firstInstance = childInstance;
								if (childInstance !== filterByChildInstance && !isChildOf(filterByChildInstance, childInstance, suspenseNode.instance)) return;
							}
							if (firstInstance !== null && firstInstance.suspendedBy !== null) {
								const asyncInfo = getAwaitInSuspendedByFromIO(firstInstance.suspendedBy, ioInfo);
								if (asyncInfo !== null) {
									let hooks = null;
									if (asyncInfo.stack == null && asyncInfo.owner == null) {
										if (hooksCacheKey === firstInstance) hooks = hooksCache;
										else if (firstInstance.kind !== VIRTUAL_INSTANCE) {
											const fiber = firstInstance.data;
											if (fiber.dependencies && fiber.dependencies._debugThenableState) {
												hooksCacheKey = firstInstance;
												hooksCache = hooks = inspectHooks(fiber);
											}
										}
									}
									const newIO = asyncInfo.awaited;
									if ((newIO.name === "RSC stream" || newIO.name === "rsc stream") && newIO.value != null) {
										const streamPromise = newIO.value;
										const existingEntry = streamEntries.get(streamPromise);
										if (existingEntry === void 0) streamEntries.set(streamPromise, {
											asyncInfo,
											instance: firstInstance,
											hooks
										});
										else {
											const existingIO = existingEntry.asyncInfo.awaited;
											if (newIO !== existingIO && (newIO.byteSize !== void 0 && existingIO.byteSize !== void 0 && newIO.byteSize > existingIO.byteSize || newIO.end > existingIO.end)) {
												existingEntry.asyncInfo = asyncInfo;
												existingEntry.instance = firstInstance;
												existingEntry.hooks = hooks;
											}
										}
									} else result.push(serializeAsyncInfo(asyncInfo, firstInstance, hooks));
								}
							}
						});
						streamEntries.forEach(({ asyncInfo, instance, hooks }) => {
							result.push(serializeAsyncInfo(asyncInfo, instance, hooks));
						});
						return result;
					}
					function getSuspendedByOfInstance(devtoolsInstance, hooks) {
						const suspendedBy = devtoolsInstance.suspendedBy;
						if (suspendedBy === null) return [];
						const foundIOEntries = /* @__PURE__ */ new Set();
						const streamEntries = /* @__PURE__ */ new Map();
						const result = [];
						for (let i = 0; i < suspendedBy.length; i++) {
							const asyncInfo = suspendedBy[i];
							const ioInfo = asyncInfo.awaited;
							if (foundIOEntries.has(ioInfo)) continue;
							foundIOEntries.add(ioInfo);
							if ((ioInfo.name === "RSC stream" || ioInfo.name === "rsc stream") && ioInfo.value != null) {
								const streamPromise = ioInfo.value;
								const existingEntry = streamEntries.get(streamPromise);
								if (existingEntry === void 0) streamEntries.set(streamPromise, asyncInfo);
								else {
									const existingIO = existingEntry.awaited;
									if (ioInfo !== existingIO && (ioInfo.byteSize !== void 0 && existingIO.byteSize !== void 0 && ioInfo.byteSize > existingIO.byteSize || ioInfo.end > existingIO.end)) streamEntries.set(streamPromise, asyncInfo);
								}
							} else result.push(serializeAsyncInfo(asyncInfo, devtoolsInstance, hooks));
						}
						streamEntries.forEach((asyncInfo) => {
							result.push(serializeAsyncInfo(asyncInfo, devtoolsInstance, hooks));
						});
						return result;
					}
					function getSuspendedByOfInstanceSubtree(devtoolsInstance) {
						let suspenseParentInstance = devtoolsInstance;
						while (suspenseParentInstance.suspenseNode === null) {
							if (suspenseParentInstance.parent === null) return [];
							suspenseParentInstance = suspenseParentInstance.parent;
						}
						const suspenseNode = suspenseParentInstance.suspenseNode;
						return getSuspendedByOfSuspenseNode(suspenseNode, devtoolsInstance);
					}
					const FALLBACK_THROTTLE_MS = 300;
					function getSuspendedByRange(suspenseNode) {
						let min = Infinity;
						let max = -Infinity;
						suspenseNode.suspendedBy.forEach((_, ioInfo) => {
							if (ioInfo.end > max) max = ioInfo.end;
							if (ioInfo.start < min) min = ioInfo.start;
						});
						const parentSuspenseNode = suspenseNode.parent;
						if (parentSuspenseNode !== null) {
							let parentMax = -Infinity;
							parentSuspenseNode.suspendedBy.forEach((_, ioInfo) => {
								if (ioInfo.end > parentMax) parentMax = ioInfo.end;
							});
							const throttleTime = parentMax + FALLBACK_THROTTLE_MS;
							if (throttleTime > max) max = throttleTime;
							let startTime = max - FALLBACK_THROTTLE_MS;
							if (parentMax > startTime) startTime = parentMax;
							if (startTime < min) min = startTime;
						}
						if (min < Infinity && max > -Infinity) return [min, max];
						return null;
					}
					function getAwaitStackFromHooks(hooks, asyncInfo) {
						for (let i = 0; i < hooks.length; i++) {
							const node = hooks[i];
							const debugInfo = node.debugInfo;
							if (debugInfo != null && debugInfo.indexOf(asyncInfo) !== -1) {
								const source = node.hookSource;
								if (source != null && source.functionName !== null && source.fileName !== null && source.lineNumber !== null && source.columnNumber !== null) return [[
									source.functionName,
									source.fileName,
									source.lineNumber,
									source.columnNumber,
									0,
									0,
									false
								]];
								else return [];
							}
							const matchedStack = getAwaitStackFromHooks(node.subHooks, asyncInfo);
							if (matchedStack !== null) {
								const source = node.hookSource;
								if (source != null && source.functionName !== null && source.fileName !== null && source.lineNumber !== null && source.columnNumber !== null) {
									const callSite = [
										source.functionName,
										source.fileName,
										source.lineNumber,
										source.columnNumber,
										0,
										0,
										false
									];
									matchedStack.push(callSite);
								}
								return matchedStack;
							}
						}
						return null;
					}
					function serializeAsyncInfo(asyncInfo, parentInstance, hooks) {
						const ioInfo = asyncInfo.awaited;
						const ioOwnerInstance = findNearestOwnerInstance(parentInstance, ioInfo.owner);
						let awaitStack = asyncInfo.debugStack == null ? null : parseStackTrace(asyncInfo.debugStack, 1);
						let awaitOwnerInstance;
						if (asyncInfo.owner == null && (awaitStack === null || awaitStack.length === 0)) {
							awaitStack = null;
							awaitOwnerInstance = parentInstance.kind === FILTERED_FIBER_INSTANCE ? null : parentInstance;
							if (parentInstance.kind === FIBER_INSTANCE || parentInstance.kind === FILTERED_FIBER_INSTANCE) {
								const fiber = parentInstance.data;
								switch (fiber.tag) {
									case ClassComponent:
									case FunctionComponent:
									case IncompleteClassComponent:
									case IncompleteFunctionComponent:
									case IndeterminateComponent:
									case MemoComponent:
									case SimpleMemoComponent:
										if (hooks !== null) awaitStack = getAwaitStackFromHooks(hooks, asyncInfo);
										break;
									default: if (fiber._debugOwner != null && fiber._debugStack != null && typeof fiber._debugStack !== "string") {
										awaitStack = parseStackTrace(fiber._debugStack, 1);
										awaitOwnerInstance = findNearestOwnerInstance(parentInstance, fiber._debugOwner);
									}
								}
							}
						} else awaitOwnerInstance = findNearestOwnerInstance(parentInstance, asyncInfo.owner);
						const value = ioInfo.value;
						let resolvedValue = void 0;
						if (typeof value === "object" && value !== null && typeof value.then === "function") switch (value.status) {
							case "fulfilled":
								resolvedValue = value.value;
								break;
							case "rejected":
								resolvedValue = value.reason;
								break;
						}
						return {
							awaited: {
								name: ioInfo.name,
								description: getIODescription(resolvedValue),
								start: ioInfo.start,
								end: ioInfo.end,
								byteSize: ioInfo.byteSize == null ? null : ioInfo.byteSize,
								value: ioInfo.value == null ? null : ioInfo.value,
								env: ioInfo.env == null ? null : ioInfo.env,
								owner: ioOwnerInstance === null ? null : instanceToSerializedElement(ioOwnerInstance),
								stack: ioInfo.debugStack == null ? null : parseStackTrace(ioInfo.debugStack, 1)
							},
							env: asyncInfo.env == null ? null : asyncInfo.env,
							owner: awaitOwnerInstance === null ? null : instanceToSerializedElement(awaitOwnerInstance),
							stack: awaitStack
						};
					}
					function getInstanceAndStyle(id) {
						let instance = null;
						let style = null;
						const devtoolsInstance = idToDevToolsInstanceMap.get(id);
						if (devtoolsInstance === void 0) {
							console.warn(`Could not find DevToolsInstance with id "${id}"`);
							return {
								instance,
								style
							};
						}
						if (devtoolsInstance.kind !== FIBER_INSTANCE) return {
							instance,
							style
						};
						const fiber = devtoolsInstance.data;
						if (fiber !== null) {
							instance = fiber.stateNode;
							if (fiber.memoizedProps !== null) style = fiber.memoizedProps.style;
						}
						return {
							instance,
							style
						};
					}
					function isErrorBoundary(fiber) {
						const { tag, type } = fiber;
						switch (tag) {
							case ClassComponent:
							case IncompleteClassComponent:
								const instance = fiber.stateNode;
								return typeof type.getDerivedStateFromError === "function" || instance !== null && typeof instance.componentDidCatch === "function";
							default: return false;
						}
					}
					function inspectElementRaw(id) {
						const devtoolsInstance = idToDevToolsInstanceMap.get(id);
						if (devtoolsInstance === void 0) {
							console.warn(`Could not find DevToolsInstance with id "${id}"`);
							return null;
						}
						if (devtoolsInstance.kind === VIRTUAL_INSTANCE) return inspectVirtualInstanceRaw(devtoolsInstance);
						if (devtoolsInstance.kind === FIBER_INSTANCE) return devtoolsInstance.parent === null ? inspectRootsRaw(devtoolsInstance.id) : inspectFiberInstanceRaw(devtoolsInstance);
						throw new Error("Unsupported instance kind");
					}
					function inspectFiberInstanceRaw(fiberInstance) {
						const fiber = fiberInstance.data;
						if (fiber == null) return null;
						const { stateNode, key, memoizedProps, memoizedState, dependencies, tag, type } = fiber;
						const elementType = getElementTypeForFiber(fiber);
						const usesHooks = (tag === FunctionComponent || tag === SimpleMemoComponent || tag === ForwardRef) && (!!memoizedState || !!dependencies);
						const showState = tag === ClassComponent || tag === IncompleteClassComponent;
						const typeSymbol = getTypeSymbol(type);
						let canViewSource = false;
						let context = null;
						if (tag === ClassComponent || tag === FunctionComponent || tag === IncompleteClassComponent || tag === IncompleteFunctionComponent || tag === IndeterminateComponent || tag === MemoComponent || tag === ForwardRef || tag === SimpleMemoComponent) {
							canViewSource = true;
							if (stateNode && stateNode.context != null) {
								if (!(elementType === types_ElementTypeClass && !(type.contextTypes || type.contextType))) context = stateNode.context;
							}
						} else if ((typeSymbol === CONTEXT_NUMBER || typeSymbol === CONTEXT_SYMBOL_STRING) && !(type._context === void 0 && type.Provider === type)) {
							const consumerResolvedContext = type._context || type;
							context = consumerResolvedContext._currentValue || null;
							let current = fiber.return;
							while (current !== null) {
								const currentType = current.type;
								const currentTypeSymbol = getTypeSymbol(currentType);
								if (currentTypeSymbol === PROVIDER_NUMBER || currentTypeSymbol === PROVIDER_SYMBOL_STRING) {
									if ((currentType._context || currentType.context) === consumerResolvedContext) {
										context = current.memoizedProps.value;
										break;
									}
								}
								current = current.return;
							}
						} else if (typeSymbol === CONSUMER_SYMBOL_STRING) {
							const consumerResolvedContext = type._context;
							context = consumerResolvedContext._currentValue || null;
							let current = fiber.return;
							while (current !== null) {
								const currentType = current.type;
								if (getTypeSymbol(currentType) === CONTEXT_SYMBOL_STRING) {
									if (currentType === consumerResolvedContext) {
										context = current.memoizedProps.value;
										break;
									}
								}
								current = current.return;
							}
						}
						let hasLegacyContext = false;
						if (context !== null) {
							hasLegacyContext = !!type.contextTypes;
							context = { value: context };
						}
						const owners = getOwnersListFromInstance(fiberInstance);
						let hooks = null;
						if (usesHooks) hooks = inspectHooks(fiber);
						let rootType = null;
						let current = fiber;
						let hasErrorBoundary = false;
						let hasSuspenseBoundary = false;
						while (current.return !== null) {
							const temp = current;
							current = current.return;
							if (temp.tag === SuspenseComponent) hasSuspenseBoundary = true;
							else if (isErrorBoundary(temp)) hasErrorBoundary = true;
						}
						const fiberRoot = current.stateNode;
						if (fiberRoot != null && fiberRoot._debugRootType !== null) rootType = fiberRoot._debugRootType;
						let isErrored = false;
						if (isErrorBoundary(fiber)) isErrored = (fiber.flags & 128) !== 0 || forceErrorForFibers.get(fiber) === true || fiber.alternate !== null && forceErrorForFibers.get(fiber.alternate) === true;
						const plugins = { stylex: null };
						let source = null;
						if (canViewSource) source = getSourceForFiberInstance(fiberInstance);
						let componentLogsEntry = fiberToComponentLogsMap.get(fiber);
						if (componentLogsEntry === void 0 && fiber.alternate !== null) componentLogsEntry = fiberToComponentLogsMap.get(fiber.alternate);
						let nativeTag = null;
						if (elementType === ElementTypeHostComponent) nativeTag = getNativeTag(fiber.stateNode);
						let isSuspended = null;
						if (tag === SuspenseComponent) isSuspended = memoizedState !== null;
						const suspendedBy = fiberInstance.suspenseNode !== null ? getSuspendedByOfSuspenseNode(fiberInstance.suspenseNode, null) : tag === ActivityComponent ? getSuspendedByOfInstanceSubtree(fiberInstance) : getSuspendedByOfInstance(fiberInstance, hooks);
						const suspendedByRange = getSuspendedByRange(getNearestSuspenseNode(fiberInstance));
						let unknownSuspenders = UNKNOWN_SUSPENDERS_NONE;
						if (fiberInstance.suspenseNode !== null && fiberInstance.suspenseNode.hasUnknownSuspenders && !isSuspended) if (renderer.bundleType === 0) unknownSuspenders = UNKNOWN_SUSPENDERS_REASON_PRODUCTION;
						else if (!("_debugInfo" in fiber)) unknownSuspenders = UNKNOWN_SUSPENDERS_REASON_OLD_VERSION;
						else unknownSuspenders = UNKNOWN_SUSPENDERS_REASON_THROWN_PROMISE;
						return {
							id: fiberInstance.id,
							canEditHooks: typeof overrideHookState === "function",
							canEditFunctionProps: typeof overrideProps === "function",
							canEditHooksAndDeletePaths: typeof overrideHookStateDeletePath === "function",
							canEditHooksAndRenamePaths: typeof overrideHookStateRenamePath === "function",
							canEditFunctionPropsDeletePaths: typeof overridePropsDeletePath === "function",
							canEditFunctionPropsRenamePaths: typeof overridePropsRenamePath === "function",
							canToggleError: supportsTogglingError && hasErrorBoundary,
							isErrored,
							canToggleSuspense: supportsTogglingSuspense && hasSuspenseBoundary && (!isSuspended || forceFallbackForFibers.has(fiber) || fiber.alternate !== null && forceFallbackForFibers.has(fiber.alternate)),
							isSuspended,
							source,
							stack: fiber._debugOwner == null || fiber._debugStack == null ? null : parseStackTrace(fiber._debugStack, 1),
							hasLegacyContext,
							key: key != null ? key : null,
							type: elementType,
							context,
							hooks,
							props: memoizedProps,
							state: showState ? memoizedState : null,
							errors: componentLogsEntry === void 0 ? [] : Array.from(componentLogsEntry.errors.entries()),
							warnings: componentLogsEntry === void 0 ? [] : Array.from(componentLogsEntry.warnings.entries()),
							suspendedBy,
							suspendedByRange,
							unknownSuspenders,
							owners,
							env: null,
							rootType,
							rendererPackageName: renderer.rendererPackageName,
							rendererVersion: renderer.version,
							plugins,
							nativeTag
						};
					}
					function inspectVirtualInstanceRaw(virtualInstance) {
						const source = getSourceForInstance(virtualInstance);
						const componentInfo = virtualInstance.data;
						const key = typeof componentInfo.key === "string" ? componentInfo.key : null;
						const props = componentInfo.props == null ? null : componentInfo.props;
						const owners = getOwnersListFromInstance(virtualInstance);
						let rootType = null;
						let hasErrorBoundary = false;
						let hasSuspenseBoundary = false;
						const nearestFiber = getNearestFiber(virtualInstance);
						if (nearestFiber !== null) {
							let current = nearestFiber;
							while (current.return !== null) {
								const temp = current;
								current = current.return;
								if (temp.tag === SuspenseComponent) hasSuspenseBoundary = true;
								else if (isErrorBoundary(temp)) hasErrorBoundary = true;
							}
							const fiberRoot = current.stateNode;
							if (fiberRoot != null && fiberRoot._debugRootType !== null) rootType = fiberRoot._debugRootType;
						}
						const plugins = { stylex: null };
						const componentLogsEntry = componentInfoToComponentLogsMap.get(componentInfo);
						const isSuspended = null;
						const suspendedBy = getSuspendedByOfInstance(virtualInstance, null);
						const suspendedByRange = getSuspendedByRange(getNearestSuspenseNode(virtualInstance));
						return {
							id: virtualInstance.id,
							canEditHooks: false,
							canEditFunctionProps: false,
							canEditHooksAndDeletePaths: false,
							canEditHooksAndRenamePaths: false,
							canEditFunctionPropsDeletePaths: false,
							canEditFunctionPropsRenamePaths: false,
							canToggleError: supportsTogglingError && hasErrorBoundary,
							isErrored: false,
							canToggleSuspense: supportsTogglingSuspense && hasSuspenseBoundary,
							isSuspended,
							source,
							stack: componentInfo.owner == null || componentInfo.debugStack == null ? null : parseStackTrace(componentInfo.debugStack, 1),
							hasLegacyContext: false,
							key,
							type: types_ElementTypeVirtual,
							context: null,
							hooks: null,
							props,
							state: null,
							errors: componentLogsEntry === void 0 ? [] : Array.from(componentLogsEntry.errors.entries()),
							warnings: componentLogsEntry === void 0 ? [] : Array.from(componentLogsEntry.warnings.entries()),
							suspendedBy,
							suspendedByRange,
							unknownSuspenders: UNKNOWN_SUSPENDERS_NONE,
							owners,
							env: componentInfo.env == null ? null : componentInfo.env,
							rootType,
							rendererPackageName: renderer.rendererPackageName,
							rendererVersion: renderer.version,
							plugins,
							nativeTag: null
						};
					}
					let mostRecentlyInspectedElement = null;
					let hasElementUpdatedSinceLastInspected = false;
					let currentlyInspectedPaths = {};
					function isMostRecentlyInspectedElement(id) {
						if (mostRecentlyInspectedElement === null) return false;
						if (mostRecentlyInspectedElement.id === id) return true;
						if (mostRecentlyInspectedElement.type === ElementTypeRoot) {
							const instance = idToDevToolsInstanceMap.get(id);
							return instance !== void 0 && instance.kind === FIBER_INSTANCE && instance.parent === null;
						}
						return false;
					}
					function isMostRecentlyInspectedElementCurrent(id) {
						return isMostRecentlyInspectedElement(id) && !hasElementUpdatedSinceLastInspected;
					}
					function mergeInspectedPaths(path) {
						let current = currentlyInspectedPaths;
						path.forEach((key) => {
							if (!current[key]) current[key] = {};
							current = current[key];
						});
					}
					function createIsPathAllowed(key, secondaryCategory) {
						return function isPathAllowed(path) {
							switch (secondaryCategory) {
								case "hooks":
									if (path.length === 1) return true;
									if (path[path.length - 2] === "hookSource" && path[path.length - 1] === "fileName") return true;
									if (path[path.length - 1] === "subHooks" || path[path.length - 2] === "subHooks") return true;
									break;
								case "suspendedBy":
									if (path.length < 5) return true;
									break;
								default: break;
							}
							let current = key === null ? currentlyInspectedPaths : currentlyInspectedPaths[key];
							if (!current) return false;
							for (let i = 0; i < path.length; i++) {
								current = current[path[i]];
								if (!current) return false;
							}
							return true;
						};
					}
					function updateSelectedElement(inspectedElement) {
						const { hooks, id, props } = inspectedElement;
						const devtoolsInstance = idToDevToolsInstanceMap.get(id);
						if (devtoolsInstance === void 0) {
							console.warn(`Could not find DevToolsInstance with id "${id}"`);
							return;
						}
						if (devtoolsInstance.kind !== FIBER_INSTANCE) return;
						const { elementType, stateNode, tag, type } = devtoolsInstance.data;
						switch (tag) {
							case ClassComponent:
							case IncompleteClassComponent:
							case IndeterminateComponent:
								global.$r = stateNode;
								break;
							case IncompleteFunctionComponent:
							case FunctionComponent:
								global.$r = {
									hooks,
									props,
									type
								};
								break;
							case ForwardRef:
								global.$r = {
									hooks,
									props,
									type: type.render
								};
								break;
							case MemoComponent:
							case SimpleMemoComponent:
								global.$r = {
									hooks,
									props,
									type: elementType != null && elementType.type != null ? elementType.type : type
								};
								break;
							default:
								global.$r = null;
								break;
						}
					}
					function storeAsGlobal(id, path, count) {
						if (isMostRecentlyInspectedElement(id)) {
							const value = utils_getInObject(mostRecentlyInspectedElement, path);
							const key = `$reactTemp${count}`;
							window[key] = value;
							console.log(key);
							console.log(value);
						}
					}
					function getSerializedElementValueByPath(id, path) {
						if (isMostRecentlyInspectedElement(id)) return serializeToString(utils_getInObject(mostRecentlyInspectedElement, path));
					}
					function inspectElement(requestID, id, path, forceFullData) {
						if (path !== null) mergeInspectedPaths(path);
						if (isMostRecentlyInspectedElement(id) && !forceFullData) {
							if (!hasElementUpdatedSinceLastInspected) if (path !== null) {
								let secondaryCategory = null;
								if (path[0] === "hooks" || path[0] === "suspendedBy") secondaryCategory = path[0];
								return {
									id,
									responseID: requestID,
									type: "hydrated-path",
									path,
									value: cleanForBridge(utils_getInObject(mostRecentlyInspectedElement, path), createIsPathAllowed(null, secondaryCategory), path)
								};
							} else return {
								id,
								responseID: requestID,
								type: "no-change"
							};
						} else currentlyInspectedPaths = {};
						hasElementUpdatedSinceLastInspected = false;
						try {
							mostRecentlyInspectedElement = inspectElementRaw(id);
						} catch (error) {
							if (error.name === "ReactDebugToolsRenderError") {
								let message = "Error rendering inspected element.";
								let stack;
								console.error(message + "\n\n", error);
								if (error.cause != null) {
									const componentName = getDisplayNameForElementID(id);
									console.error("React DevTools encountered an error while trying to inspect hooks. This is most likely caused by an error in current inspected component" + (componentName != null ? `: "${componentName}".` : ".") + "\nThe error thrown in the component is: \n\n", error.cause);
									if (error.cause instanceof Error) {
										message = error.cause.message || message;
										stack = error.cause.stack;
									}
								}
								return {
									type: "error",
									errorType: "user",
									id,
									responseID: requestID,
									message,
									stack
								};
							}
							if (error.name === "ReactDebugToolsUnsupportedHookError") return {
								type: "error",
								errorType: "unknown-hook",
								id,
								responseID: requestID,
								message: "Unsupported hook in the react-debug-tools package: " + error.message
							};
							console.error("Error inspecting element.\n\n", error);
							return {
								type: "error",
								errorType: "uncaught",
								id,
								responseID: requestID,
								message: error.message,
								stack: error.stack
							};
						}
						if (mostRecentlyInspectedElement === null) return {
							id,
							responseID: requestID,
							type: "not-found"
						};
						const inspectedElement = mostRecentlyInspectedElement;
						updateSelectedElement(inspectedElement);
						const cleanedInspectedElement = { ...inspectedElement };
						cleanedInspectedElement.context = cleanForBridge(inspectedElement.context, createIsPathAllowed("context", null));
						cleanedInspectedElement.hooks = cleanForBridge(inspectedElement.hooks, createIsPathAllowed("hooks", "hooks"));
						cleanedInspectedElement.props = cleanForBridge(inspectedElement.props, createIsPathAllowed("props", null));
						cleanedInspectedElement.state = cleanForBridge(inspectedElement.state, createIsPathAllowed("state", null));
						cleanedInspectedElement.suspendedBy = cleanForBridge(inspectedElement.suspendedBy, createIsPathAllowed("suspendedBy", "suspendedBy"));
						return {
							id,
							responseID: requestID,
							type: "full-data",
							value: cleanedInspectedElement
						};
					}
					function inspectRootsRaw(arbitraryRootID) {
						const roots = hook.getFiberRoots(rendererID);
						if (roots.size === 0) return null;
						const inspectedRoots = {
							id: arbitraryRootID,
							type: ElementTypeRoot,
							isErrored: false,
							errors: [],
							warnings: [],
							suspendedBy: [],
							suspendedByRange: null,
							unknownSuspenders: UNKNOWN_SUSPENDERS_NONE,
							rootType: null,
							plugins: { stylex: null },
							nativeTag: null,
							env: null,
							source: null,
							stack: null,
							rendererPackageName: null,
							rendererVersion: null,
							key: null,
							canEditFunctionProps: false,
							canEditHooks: false,
							canEditFunctionPropsDeletePaths: false,
							canEditFunctionPropsRenamePaths: false,
							canEditHooksAndDeletePaths: false,
							canEditHooksAndRenamePaths: false,
							canToggleError: false,
							canToggleSuspense: false,
							isSuspended: false,
							hasLegacyContext: false,
							context: null,
							hooks: null,
							props: null,
							state: null,
							owners: null
						};
						let minSuspendedByRange = Infinity;
						let maxSuspendedByRange = -Infinity;
						roots.forEach((root) => {
							const rootInstance = rootToFiberInstanceMap.get(root);
							if (rootInstance === void 0) throw new Error("Expected a root instance to exist for this Fiber root");
							const inspectedRoot = inspectFiberInstanceRaw(rootInstance);
							if (inspectedRoot === null) return;
							if (inspectedRoot.isErrored) inspectedRoots.isErrored = true;
							for (let i = 0; i < inspectedRoot.errors.length; i++) inspectedRoots.errors.push(inspectedRoot.errors[i]);
							for (let i = 0; i < inspectedRoot.warnings.length; i++) inspectedRoots.warnings.push(inspectedRoot.warnings[i]);
							for (let i = 0; i < inspectedRoot.suspendedBy.length; i++) inspectedRoots.suspendedBy.push(inspectedRoot.suspendedBy[i]);
							const suspendedByRange = inspectedRoot.suspendedByRange;
							if (suspendedByRange !== null) {
								if (suspendedByRange[0] < minSuspendedByRange) minSuspendedByRange = suspendedByRange[0];
								if (suspendedByRange[1] > maxSuspendedByRange) maxSuspendedByRange = suspendedByRange[1];
							}
						});
						if (minSuspendedByRange !== Infinity || maxSuspendedByRange !== -Infinity) inspectedRoots.suspendedByRange = [minSuspendedByRange, maxSuspendedByRange];
						return inspectedRoots;
					}
					function logElementToConsole(id) {
						const result = isMostRecentlyInspectedElementCurrent(id) ? mostRecentlyInspectedElement : inspectElementRaw(id);
						if (result === null) {
							console.warn(`Could not find DevToolsInstance with id "${id}"`);
							return;
						}
						const displayName = getDisplayNameForElementID(id);
						const supportsGroup = typeof console.groupCollapsed === "function";
						if (supportsGroup) console.groupCollapsed(`[Click to expand] %c<${displayName || "Component"} />`, "color: var(--dom-tag-name-color); font-weight: normal;");
						if (result.props !== null) console.log("Props:", result.props);
						if (result.state !== null) console.log("State:", result.state);
						if (result.hooks !== null) console.log("Hooks:", result.hooks);
						const hostInstances = findHostInstancesForElementID(id);
						if (hostInstances !== null) console.log("Nodes:", hostInstances);
						if (window.chrome || /firefox/i.test(navigator.userAgent)) console.log("Right-click any value to save it as a global variable for further inspection.");
						if (supportsGroup) console.groupEnd();
					}
					function deletePath(type, id, hookID, path) {
						const devtoolsInstance = idToDevToolsInstanceMap.get(id);
						if (devtoolsInstance === void 0) {
							console.warn(`Could not find DevToolsInstance with id "${id}"`);
							return;
						}
						if (devtoolsInstance.kind !== FIBER_INSTANCE) return;
						const fiber = devtoolsInstance.data;
						if (fiber !== null) {
							const instance = fiber.stateNode;
							switch (type) {
								case "context":
									path = path.slice(1);
									switch (fiber.tag) {
										case ClassComponent:
											if (path.length === 0) {} else deletePathInObject(instance.context, path);
											instance.forceUpdate();
											break;
										case FunctionComponent: break;
									}
									break;
								case "hooks":
									if (typeof overrideHookStateDeletePath === "function") overrideHookStateDeletePath(fiber, hookID, path);
									break;
								case "props":
									if (instance === null) {
										if (typeof overridePropsDeletePath === "function") overridePropsDeletePath(fiber, path);
									} else {
										fiber.pendingProps = copyWithDelete(instance.props, path);
										instance.forceUpdate();
									}
									break;
								case "state":
									deletePathInObject(instance.state, path);
									instance.forceUpdate();
									break;
							}
						}
					}
					function renamePath(type, id, hookID, oldPath, newPath) {
						const devtoolsInstance = idToDevToolsInstanceMap.get(id);
						if (devtoolsInstance === void 0) {
							console.warn(`Could not find DevToolsInstance with id "${id}"`);
							return;
						}
						if (devtoolsInstance.kind !== FIBER_INSTANCE) return;
						const fiber = devtoolsInstance.data;
						if (fiber !== null) {
							const instance = fiber.stateNode;
							switch (type) {
								case "context":
									oldPath = oldPath.slice(1);
									newPath = newPath.slice(1);
									switch (fiber.tag) {
										case ClassComponent:
											if (oldPath.length === 0) {} else renamePathInObject(instance.context, oldPath, newPath);
											instance.forceUpdate();
											break;
										case FunctionComponent: break;
									}
									break;
								case "hooks":
									if (typeof overrideHookStateRenamePath === "function") overrideHookStateRenamePath(fiber, hookID, oldPath, newPath);
									break;
								case "props":
									if (instance === null) {
										if (typeof overridePropsRenamePath === "function") overridePropsRenamePath(fiber, oldPath, newPath);
									} else {
										fiber.pendingProps = copyWithRename(instance.props, oldPath, newPath);
										instance.forceUpdate();
									}
									break;
								case "state":
									renamePathInObject(instance.state, oldPath, newPath);
									instance.forceUpdate();
									break;
							}
						}
					}
					function overrideValueAtPath(type, id, hookID, path, value) {
						const devtoolsInstance = idToDevToolsInstanceMap.get(id);
						if (devtoolsInstance === void 0) {
							console.warn(`Could not find DevToolsInstance with id "${id}"`);
							return;
						}
						if (devtoolsInstance.kind !== FIBER_INSTANCE) return;
						const fiber = devtoolsInstance.data;
						if (fiber !== null) {
							const instance = fiber.stateNode;
							switch (type) {
								case "context":
									path = path.slice(1);
									switch (fiber.tag) {
										case ClassComponent:
											if (path.length === 0) instance.context = value;
											else utils_setInObject(instance.context, path, value);
											instance.forceUpdate();
											break;
										case FunctionComponent: break;
									}
									break;
								case "hooks":
									if (typeof overrideHookState === "function") overrideHookState(fiber, hookID, path, value);
									break;
								case "props":
									switch (fiber.tag) {
										case ClassComponent:
											fiber.pendingProps = copyWithSet(instance.props, path, value);
											instance.forceUpdate();
											break;
										default:
											if (typeof overrideProps === "function") overrideProps(fiber, path, value);
											break;
									}
									break;
								case "state":
									switch (fiber.tag) {
										case ClassComponent:
											utils_setInObject(instance.state, path, value);
											instance.forceUpdate();
											break;
									}
									break;
							}
						}
					}
					let currentCommitProfilingMetadata = null;
					let displayNamesByRootID = null;
					let initialTreeBaseDurationsMap = null;
					let isProfiling = false;
					let profilingStartTime = 0;
					let recordChangeDescriptions = false;
					let recordTimeline = false;
					let rootToCommitProfilingMetadataMap = null;
					function getProfilingData() {
						const dataForRoots = [];
						if (rootToCommitProfilingMetadataMap === null) throw Error("getProfilingData() called before any profiling data was recorded");
						rootToCommitProfilingMetadataMap.forEach((commitProfilingMetadata, rootID) => {
							const commitData = [];
							const displayName = displayNamesByRootID !== null && displayNamesByRootID.get(rootID) || "Unknown";
							const initialTreeBaseDurations = initialTreeBaseDurationsMap !== null && initialTreeBaseDurationsMap.get(rootID) || [];
							commitProfilingMetadata.forEach((commitProfilingData, commitIndex) => {
								const { changeDescriptions, durations, effectDuration, maxActualDuration, passiveEffectDuration, priorityLevel, commitTime, updaters } = commitProfilingData;
								const fiberActualDurations = [];
								const fiberSelfDurations = [];
								for (let i = 0; i < durations.length; i += 3) {
									const fiberID = durations[i];
									fiberActualDurations.push([fiberID, formatDurationToMicrosecondsGranularity(durations[i + 1])]);
									fiberSelfDurations.push([fiberID, formatDurationToMicrosecondsGranularity(durations[i + 2])]);
								}
								commitData.push({
									changeDescriptions: changeDescriptions !== null ? Array.from(changeDescriptions.entries()) : null,
									duration: formatDurationToMicrosecondsGranularity(maxActualDuration),
									effectDuration: effectDuration !== null ? formatDurationToMicrosecondsGranularity(effectDuration) : null,
									fiberActualDurations,
									fiberSelfDurations,
									passiveEffectDuration: passiveEffectDuration !== null ? formatDurationToMicrosecondsGranularity(passiveEffectDuration) : null,
									priorityLevel,
									timestamp: commitTime,
									updaters
								});
							});
							dataForRoots.push({
								commitData,
								displayName,
								initialTreeBaseDurations,
								rootID
							});
						});
						let timelineData = null;
						if (typeof getTimelineData === "function") {
							const currentTimelineData = getTimelineData();
							if (currentTimelineData) {
								const { batchUIDToMeasuresMap, internalModuleSourceToRanges, laneToLabelMap, laneToReactMeasureMap, ...rest } = currentTimelineData;
								timelineData = {
									...rest,
									batchUIDToMeasuresKeyValueArray: Array.from(batchUIDToMeasuresMap.entries()),
									internalModuleSourceToRanges: Array.from(internalModuleSourceToRanges.entries()),
									laneToLabelKeyValueArray: Array.from(laneToLabelMap.entries()),
									laneToReactMeasureKeyValueArray: Array.from(laneToReactMeasureMap.entries())
								};
							}
						}
						return {
							dataForRoots,
							rendererID,
							timelineData
						};
					}
					function snapshotTreeBaseDurations(instance, target) {
						if (instance.kind !== FILTERED_FIBER_INSTANCE) target.push([instance.id, instance.treeBaseDuration]);
						for (let child = instance.firstChild; child !== null; child = child.nextSibling) snapshotTreeBaseDurations(child, target);
					}
					function startProfiling(shouldRecordChangeDescriptions, shouldRecordTimeline) {
						if (isProfiling) return;
						recordChangeDescriptions = shouldRecordChangeDescriptions;
						recordTimeline = shouldRecordTimeline;
						displayNamesByRootID = /* @__PURE__ */ new Map();
						initialTreeBaseDurationsMap = /* @__PURE__ */ new Map();
						hook.getFiberRoots(rendererID).forEach((root) => {
							const rootInstance = rootToFiberInstanceMap.get(root);
							if (rootInstance === void 0) throw new Error("Expected the root instance to already exist when starting profiling");
							const rootID = rootInstance.id;
							displayNamesByRootID.set(rootID, getDisplayNameForRoot(root.current));
							const initialTreeBaseDurations = [];
							snapshotTreeBaseDurations(rootInstance, initialTreeBaseDurations);
							initialTreeBaseDurationsMap.set(rootID, initialTreeBaseDurations);
						});
						isProfiling = true;
						profilingStartTime = renderer_getCurrentTime();
						rootToCommitProfilingMetadataMap = /* @__PURE__ */ new Map();
						if (toggleProfilingStatus !== null) toggleProfilingStatus(true, recordTimeline);
					}
					function stopProfiling() {
						isProfiling = false;
						recordChangeDescriptions = false;
						if (toggleProfilingStatus !== null) toggleProfilingStatus(false, recordTimeline);
						recordTimeline = false;
					}
					if (shouldStartProfilingNow) startProfiling(profilingSettings.recordChangeDescriptions, profilingSettings.recordTimeline);
					function getNearestFiber(devtoolsInstance) {
						if (devtoolsInstance.kind === VIRTUAL_INSTANCE) {
							let inst = devtoolsInstance;
							while (inst.kind === VIRTUAL_INSTANCE) {
								if (inst.firstChild === null) return null;
								inst = inst.firstChild;
							}
							return inst.data.return;
						} else return devtoolsInstance.data;
					}
					function shouldErrorFiberAlwaysNull() {
						return null;
					}
					const forceErrorForFibers = /* @__PURE__ */ new Map();
					function shouldErrorFiberAccordingToMap(fiber) {
						if (typeof setErrorHandler !== "function") throw new Error("Expected overrideError() to not get called for earlier React versions.");
						let status = forceErrorForFibers.get(fiber);
						if (status === false) {
							forceErrorForFibers.delete(fiber);
							if (forceErrorForFibers.size === 0) setErrorHandler(shouldErrorFiberAlwaysNull);
							return false;
						}
						if (status === void 0 && fiber.alternate !== null) {
							status = forceErrorForFibers.get(fiber.alternate);
							if (status === false) {
								forceErrorForFibers.delete(fiber.alternate);
								if (forceErrorForFibers.size === 0) setErrorHandler(shouldErrorFiberAlwaysNull);
							}
						}
						if (status === void 0) return false;
						return status;
					}
					function overrideError(id, forceError) {
						if (typeof setErrorHandler !== "function" || typeof scheduleUpdate !== "function") throw new Error("Expected overrideError() to not get called for earlier React versions.");
						const devtoolsInstance = idToDevToolsInstanceMap.get(id);
						if (devtoolsInstance === void 0) return;
						const nearestFiber = getNearestFiber(devtoolsInstance);
						if (nearestFiber === null) return;
						let fiber = nearestFiber;
						while (!isErrorBoundary(fiber)) {
							if (fiber.return === null) return;
							fiber = fiber.return;
						}
						forceErrorForFibers.set(fiber, forceError);
						if (fiber.alternate !== null) forceErrorForFibers.delete(fiber.alternate);
						if (forceErrorForFibers.size === 1) setErrorHandler(shouldErrorFiberAccordingToMap);
						if (!forceError && typeof scheduleRetry === "function") scheduleRetry(fiber);
						else scheduleUpdate(fiber);
					}
					function shouldSuspendFiberAlwaysFalse() {
						return false;
					}
					const forceFallbackForFibers = /* @__PURE__ */ new Set();
					function shouldSuspendFiberAccordingToSet(fiber) {
						return forceFallbackForFibers.has(fiber) || fiber.alternate !== null && forceFallbackForFibers.has(fiber.alternate);
					}
					function overrideSuspense(id, forceFallback) {
						if (typeof setSuspenseHandler !== "function" || typeof scheduleUpdate !== "function") throw new Error("Expected overrideSuspense() to not get called for earlier React versions.");
						const devtoolsInstance = idToDevToolsInstanceMap.get(id);
						if (devtoolsInstance === void 0) return;
						const nearestFiber = getNearestFiber(devtoolsInstance);
						if (nearestFiber === null) return;
						let fiber = nearestFiber;
						while (fiber.tag !== SuspenseComponent) {
							if (fiber.return === null) return;
							fiber = fiber.return;
						}
						if (fiber.alternate !== null) forceFallbackForFibers.delete(fiber.alternate);
						if (forceFallback) {
							forceFallbackForFibers.add(fiber);
							if (forceFallbackForFibers.size === 1) setSuspenseHandler(shouldSuspendFiberAccordingToSet);
						} else {
							forceFallbackForFibers.delete(fiber);
							if (forceFallbackForFibers.size === 0) setSuspenseHandler(shouldSuspendFiberAlwaysFalse);
						}
						if (!forceFallback && typeof scheduleRetry === "function") scheduleRetry(fiber);
						else scheduleUpdate(fiber);
					}
					function overrideSuspenseMilestone(suspendedSet) {
						if (typeof setSuspenseHandler !== "function" || typeof scheduleUpdate !== "function") throw new Error("Expected overrideSuspenseMilestone() to not get called for earlier React versions.");
						const unsuspendedSet = new Set(forceFallbackForFibers);
						let resuspended = false;
						for (let i = 0; i < suspendedSet.length; ++i) {
							const instance = idToDevToolsInstanceMap.get(suspendedSet[i]);
							if (instance === void 0) {
								console.warn(`Could not suspend ID '${suspendedSet[i]}' since the instance can't be found.`);
								continue;
							}
							if (instance.kind === FIBER_INSTANCE) {
								const fiber = instance.data;
								if (forceFallbackForFibers.has(fiber) || fiber.alternate !== null && forceFallbackForFibers.has(fiber.alternate)) {
									unsuspendedSet.delete(fiber);
									if (fiber.alternate !== null) unsuspendedSet.delete(fiber.alternate);
								} else {
									forceFallbackForFibers.add(fiber);
									scheduleUpdate(fiber);
									resuspended = true;
								}
							} else console.warn(`Cannot not suspend ID '${suspendedSet[i]}'.`);
						}
						unsuspendedSet.forEach((fiber) => {
							forceFallbackForFibers.delete(fiber);
							if (!resuspended && typeof scheduleRetry === "function") scheduleRetry(fiber);
							else scheduleUpdate(fiber);
						});
						if (forceFallbackForFibers.size > 0) setSuspenseHandler(shouldSuspendFiberAccordingToSet);
						else setSuspenseHandler(shouldSuspendFiberAlwaysFalse);
					}
					let trackedPath = null;
					let trackedPathMatchFiber = null;
					let trackedPathMatchInstance = null;
					let trackedPathMatchDepth = -1;
					let mightBeOnTrackedPath = false;
					function setTrackedPath(path) {
						if (path === null) {
							trackedPathMatchFiber = null;
							trackedPathMatchInstance = null;
							trackedPathMatchDepth = -1;
							mightBeOnTrackedPath = false;
						}
						trackedPath = path;
					}
					function updateTrackedPathStateBeforeMount(fiber, fiberInstance) {
						if (trackedPath === null || !mightBeOnTrackedPath) return false;
						const returnFiber = fiber.return;
						const returnAlternate = returnFiber !== null ? returnFiber.alternate : null;
						if (trackedPathMatchFiber === returnFiber || trackedPathMatchFiber === returnAlternate && returnAlternate !== null) {
							const actualFrame = getPathFrame(fiber);
							const expectedFrame = trackedPath[trackedPathMatchDepth + 1];
							if (expectedFrame === void 0) throw new Error("Expected to see a frame at the next depth.");
							if (actualFrame.index === expectedFrame.index && actualFrame.key === expectedFrame.key && actualFrame.displayName === expectedFrame.displayName) {
								trackedPathMatchFiber = fiber;
								if (fiberInstance !== null && fiberInstance.kind === FIBER_INSTANCE) trackedPathMatchInstance = fiberInstance;
								trackedPathMatchDepth++;
								if (trackedPathMatchDepth === trackedPath.length - 1) mightBeOnTrackedPath = false;
								else mightBeOnTrackedPath = true;
								return false;
							}
						}
						if (trackedPathMatchFiber === null && fiberInstance === null) return true;
						mightBeOnTrackedPath = false;
						return true;
					}
					function updateVirtualTrackedPathStateBeforeMount(virtualInstance, parentInstance) {
						if (trackedPath === null || !mightBeOnTrackedPath) return false;
						if (trackedPathMatchInstance === parentInstance) {
							const actualFrame = getVirtualPathFrame(virtualInstance);
							const expectedFrame = trackedPath[trackedPathMatchDepth + 1];
							if (expectedFrame === void 0) throw new Error("Expected to see a frame at the next depth.");
							if (actualFrame.index === expectedFrame.index && actualFrame.key === expectedFrame.key && actualFrame.displayName === expectedFrame.displayName) {
								trackedPathMatchFiber = null;
								trackedPathMatchInstance = virtualInstance;
								trackedPathMatchDepth++;
								if (trackedPathMatchDepth === trackedPath.length - 1) mightBeOnTrackedPath = false;
								else mightBeOnTrackedPath = true;
								return false;
							}
						}
						if (trackedPathMatchFiber !== null) return true;
						mightBeOnTrackedPath = false;
						return true;
					}
					function updateTrackedPathStateAfterMount(mightSiblingsBeOnTrackedPath) {
						mightBeOnTrackedPath = mightSiblingsBeOnTrackedPath;
					}
					const rootPseudoKeys = /* @__PURE__ */ new Map();
					const rootDisplayNameCounter = /* @__PURE__ */ new Map();
					function setRootPseudoKey(id, fiber) {
						const name = getDisplayNameForRoot(fiber);
						const counter = rootDisplayNameCounter.get(name) || 0;
						rootDisplayNameCounter.set(name, counter + 1);
						const pseudoKey = `${name}:${counter}`;
						rootPseudoKeys.set(id, pseudoKey);
					}
					function removeRootPseudoKey(id) {
						const pseudoKey = rootPseudoKeys.get(id);
						if (pseudoKey === void 0) throw new Error("Expected root pseudo key to be known.");
						const name = pseudoKey.slice(0, pseudoKey.lastIndexOf(":"));
						const counter = rootDisplayNameCounter.get(name);
						if (counter === void 0) throw new Error("Expected counter to be known.");
						if (counter > 1) rootDisplayNameCounter.set(name, counter - 1);
						else rootDisplayNameCounter.delete(name);
						rootPseudoKeys.delete(id);
					}
					function getDisplayNameForRoot(fiber) {
						let preferredDisplayName = null;
						let fallbackDisplayName = null;
						let child = fiber.child;
						for (let i = 0; i < 3; i++) {
							if (child === null) break;
							const displayName = getDisplayNameForFiber(child);
							if (displayName !== null) {
								if (typeof child.type === "function") preferredDisplayName = displayName;
								else if (fallbackDisplayName === null) fallbackDisplayName = displayName;
							}
							if (preferredDisplayName !== null) break;
							child = child.child;
						}
						return preferredDisplayName || fallbackDisplayName || "Anonymous";
					}
					function getPathFrame(fiber) {
						const { key } = fiber;
						let displayName = getDisplayNameForFiber(fiber);
						const index = fiber.index;
						switch (fiber.tag) {
							case HostRoot:
								const rootInstance = rootToFiberInstanceMap.get(fiber.stateNode);
								if (rootInstance === void 0) throw new Error("Expected the root instance to exist when computing a path");
								const pseudoKey = rootPseudoKeys.get(rootInstance.id);
								if (pseudoKey === void 0) throw new Error("Expected mounted root to have known pseudo key.");
								displayName = pseudoKey;
								break;
							case HostComponent:
								displayName = fiber.type;
								break;
							default: break;
						}
						return {
							displayName,
							key,
							index
						};
					}
					function getVirtualPathFrame(virtualInstance) {
						return {
							displayName: virtualInstance.data.name || "",
							key: virtualInstance.data.key == null ? null : virtualInstance.data.key,
							index: -1
						};
					}
					function getPathForElement(id) {
						const devtoolsInstance = idToDevToolsInstanceMap.get(id);
						if (devtoolsInstance === void 0) return null;
						const keyPath = [];
						let inst = devtoolsInstance;
						while (inst.kind === VIRTUAL_INSTANCE) {
							keyPath.push(getVirtualPathFrame(inst));
							if (inst.parent === null) return null;
							inst = inst.parent;
						}
						let fiber = inst.data;
						while (fiber !== null) {
							keyPath.push(getPathFrame(fiber));
							fiber = fiber.return;
						}
						keyPath.reverse();
						return keyPath;
					}
					function getBestMatchForTrackedPath() {
						if (trackedPath === null) return null;
						if (trackedPathMatchInstance === null) return null;
						return {
							id: trackedPathMatchInstance.id,
							isFullMatch: trackedPathMatchDepth === trackedPath.length - 1
						};
					}
					const formatPriorityLevel = (priorityLevel) => {
						if (priorityLevel == null) return "Unknown";
						switch (priorityLevel) {
							case ImmediatePriority: return "Immediate";
							case UserBlockingPriority: return "User-Blocking";
							case NormalPriority: return "Normal";
							case LowPriority: return "Low";
							case IdlePriority: return "Idle";
							case NoPriority:
							default: return "Unknown";
						}
					};
					function setTraceUpdatesEnabled(isEnabled) {
						traceUpdatesEnabled = isEnabled;
					}
					function hasElementWithId(id) {
						return idToDevToolsInstanceMap.has(id);
					}
					function getSourceForFiberInstance(fiberInstance) {
						const ownerSource = getSourceForInstance(fiberInstance);
						if (ownerSource !== null) return ownerSource;
						const dispatcherRef = getDispatcherRef(renderer);
						const stackFrame = dispatcherRef == null ? null : getSourceLocationByFiber(ReactTypeOfWork, fiberInstance.data, dispatcherRef);
						if (stackFrame === null) return null;
						const source = extractLocationFromComponentStack(stackFrame);
						fiberInstance.source = source;
						return source;
					}
					function getSourceForInstance(instance) {
						let unresolvedSource = instance.source;
						if (unresolvedSource === null) return null;
						if (instance.kind === VIRTUAL_INSTANCE) {
							const debugLocation = instance.data.debugLocation;
							if (debugLocation != null) unresolvedSource = debugLocation;
						}
						if (renderer_isError(unresolvedSource)) return instance.source = extractLocationFromOwnerStack(unresolvedSource);
						if (typeof unresolvedSource === "string") {
							const idx = unresolvedSource.lastIndexOf("\n");
							return instance.source = extractLocationFromComponentStack(idx === -1 ? unresolvedSource : unresolvedSource.slice(idx + 1));
						}
						return unresolvedSource;
					}
					return {
						cleanup,
						clearErrorsAndWarnings,
						clearErrorsForElementID,
						clearWarningsForElementID,
						getSerializedElementValueByPath,
						deletePath,
						findHostInstancesForElementID,
						findLastKnownRectsForID,
						flushInitialOperations,
						getBestMatchForTrackedPath,
						getDisplayNameForElementID,
						getNearestMountedDOMNode,
						getElementIDForHostInstance,
						getSuspenseNodeIDForHostInstance,
						getInstanceAndStyle,
						getOwnersList,
						getPathForElement,
						getProfilingData,
						handleCommitFiberRoot,
						handleCommitFiberUnmount,
						handlePostCommitFiberRoot,
						hasElementWithId,
						inspectElement,
						logElementToConsole,
						getComponentStack,
						getElementAttributeByPath,
						getElementSourceFunctionById,
						onErrorOrWarning,
						overrideError,
						overrideSuspense,
						overrideSuspenseMilestone,
						overrideValueAtPath,
						renamePath,
						renderer,
						setTraceUpdatesEnabled,
						setTrackedPath,
						startProfiling,
						stopProfiling,
						storeAsGlobal,
						supportsTogglingSuspense,
						updateComponentFilters,
						getEnvironmentNames
					};
				}
				function decorate(object, attr, fn) {
					const old = object[attr];
					object[attr] = function(instance) {
						return fn.call(this, old, arguments);
					};
					return old;
				}
				function decorateMany(source, fns) {
					const olds = {};
					for (const name in fns) olds[name] = decorate(source, name, fns[name]);
					return olds;
				}
				function restoreMany(source, olds) {
					for (const name in olds) source[name] = olds[name];
				}
				function forceUpdate(instance) {
					if (typeof instance.forceUpdate === "function") instance.forceUpdate();
					else if (instance.updater != null && typeof instance.updater.enqueueForceUpdate === "function") instance.updater.enqueueForceUpdate(this, () => {}, "forceUpdate");
				}
				function getData(internalInstance) {
					let displayName = null;
					let key = null;
					if (internalInstance._currentElement != null) {
						if (internalInstance._currentElement.key) key = String(internalInstance._currentElement.key);
						const elementType = internalInstance._currentElement.type;
						if (typeof elementType === "string") displayName = elementType;
						else if (typeof elementType === "function") displayName = getDisplayName(elementType);
					}
					return {
						displayName,
						key
					};
				}
				function getElementType(internalInstance) {
					if (internalInstance._currentElement != null) {
						const elementType = internalInstance._currentElement.type;
						if (typeof elementType === "function") if (internalInstance.getPublicInstance() !== null) return types_ElementTypeClass;
						else return types_ElementTypeFunction;
						else if (typeof elementType === "string") return ElementTypeHostComponent;
					}
					return ElementTypeOtherOrUnknown;
				}
				function getChildren(internalInstance) {
					const children = [];
					if (typeof internalInstance !== "object") {} else if (internalInstance._currentElement === null || internalInstance._currentElement === false) {} else if (internalInstance._renderedComponent) {
						const child = internalInstance._renderedComponent;
						if (getElementType(child) !== ElementTypeOtherOrUnknown) children.push(child);
					} else if (internalInstance._renderedChildren) {
						const renderedChildren = internalInstance._renderedChildren;
						for (const name in renderedChildren) {
							const child = renderedChildren[name];
							if (getElementType(child) !== ElementTypeOtherOrUnknown) children.push(child);
						}
					}
					return children;
				}
				function legacy_renderer_attach(hook, rendererID, renderer, global) {
					const idToInternalInstanceMap = /* @__PURE__ */ new Map();
					const internalInstanceToIDMap = /* @__PURE__ */ new WeakMap();
					const internalInstanceToRootIDMap = /* @__PURE__ */ new WeakMap();
					let getElementIDForHostInstance = null;
					let findHostInstanceForInternalID;
					let getNearestMountedDOMNode = (node) => {
						return null;
					};
					if (renderer.ComponentTree) {
						getElementIDForHostInstance = (node) => {
							const internalInstance = renderer.ComponentTree.getClosestInstanceFromNode(node);
							return internalInstanceToIDMap.get(internalInstance) || null;
						};
						findHostInstanceForInternalID = (id) => {
							const internalInstance = idToInternalInstanceMap.get(id);
							return renderer.ComponentTree.getNodeFromInstance(internalInstance);
						};
						getNearestMountedDOMNode = (node) => {
							const internalInstance = renderer.ComponentTree.getClosestInstanceFromNode(node);
							if (internalInstance != null) return renderer.ComponentTree.getNodeFromInstance(internalInstance);
							return null;
						};
					} else if (renderer.Mount.getID && renderer.Mount.getNode) {
						getElementIDForHostInstance = (node) => {
							return null;
						};
						findHostInstanceForInternalID = (id) => {
							return null;
						};
					}
					const supportsTogglingSuspense = false;
					function getDisplayNameForElementID(id) {
						const internalInstance = idToInternalInstanceMap.get(id);
						return internalInstance ? getData(internalInstance).displayName : null;
					}
					function getID(internalInstance) {
						if (typeof internalInstance !== "object" || internalInstance === null) throw new Error("Invalid internal instance: " + internalInstance);
						if (!internalInstanceToIDMap.has(internalInstance)) {
							const id = getUID();
							internalInstanceToIDMap.set(internalInstance, id);
							idToInternalInstanceMap.set(id, internalInstance);
						}
						return internalInstanceToIDMap.get(internalInstance);
					}
					function areEqualArrays(a, b) {
						if (a.length !== b.length) return false;
						for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
						return true;
					}
					let parentIDStack = [];
					let oldReconcilerMethods = null;
					if (renderer.Reconciler) oldReconcilerMethods = decorateMany(renderer.Reconciler, {
						mountComponent(fn, args) {
							const internalInstance = args[0];
							const hostContainerInfo = args[3];
							if (getElementType(internalInstance) === ElementTypeOtherOrUnknown) return fn.apply(this, args);
							if (hostContainerInfo._topLevelWrapper === void 0) return fn.apply(this, args);
							const id = getID(internalInstance);
							recordMount(internalInstance, id, parentIDStack.length > 0 ? parentIDStack[parentIDStack.length - 1] : 0);
							parentIDStack.push(id);
							internalInstanceToRootIDMap.set(internalInstance, getID(hostContainerInfo._topLevelWrapper));
							try {
								const result = fn.apply(this, args);
								parentIDStack.pop();
								return result;
							} catch (err) {
								parentIDStack = [];
								throw err;
							} finally {
								if (parentIDStack.length === 0) {
									const rootID = internalInstanceToRootIDMap.get(internalInstance);
									if (rootID === void 0) throw new Error("Expected to find root ID.");
									flushPendingEvents(rootID);
								}
							}
						},
						performUpdateIfNecessary(fn, args) {
							const internalInstance = args[0];
							if (getElementType(internalInstance) === ElementTypeOtherOrUnknown) return fn.apply(this, args);
							const id = getID(internalInstance);
							parentIDStack.push(id);
							const prevChildren = getChildren(internalInstance);
							try {
								const result = fn.apply(this, args);
								const nextChildren = getChildren(internalInstance);
								if (!areEqualArrays(prevChildren, nextChildren)) recordReorder(internalInstance, id, nextChildren);
								parentIDStack.pop();
								return result;
							} catch (err) {
								parentIDStack = [];
								throw err;
							} finally {
								if (parentIDStack.length === 0) {
									const rootID = internalInstanceToRootIDMap.get(internalInstance);
									if (rootID === void 0) throw new Error("Expected to find root ID.");
									flushPendingEvents(rootID);
								}
							}
						},
						receiveComponent(fn, args) {
							const internalInstance = args[0];
							if (getElementType(internalInstance) === ElementTypeOtherOrUnknown) return fn.apply(this, args);
							const id = getID(internalInstance);
							parentIDStack.push(id);
							const prevChildren = getChildren(internalInstance);
							try {
								const result = fn.apply(this, args);
								const nextChildren = getChildren(internalInstance);
								if (!areEqualArrays(prevChildren, nextChildren)) recordReorder(internalInstance, id, nextChildren);
								parentIDStack.pop();
								return result;
							} catch (err) {
								parentIDStack = [];
								throw err;
							} finally {
								if (parentIDStack.length === 0) {
									const rootID = internalInstanceToRootIDMap.get(internalInstance);
									if (rootID === void 0) throw new Error("Expected to find root ID.");
									flushPendingEvents(rootID);
								}
							}
						},
						unmountComponent(fn, args) {
							const internalInstance = args[0];
							if (getElementType(internalInstance) === ElementTypeOtherOrUnknown) return fn.apply(this, args);
							const id = getID(internalInstance);
							parentIDStack.push(id);
							try {
								const result = fn.apply(this, args);
								parentIDStack.pop();
								recordUnmount(internalInstance, id);
								return result;
							} catch (err) {
								parentIDStack = [];
								throw err;
							} finally {
								if (parentIDStack.length === 0) {
									const rootID = internalInstanceToRootIDMap.get(internalInstance);
									if (rootID === void 0) throw new Error("Expected to find root ID.");
									flushPendingEvents(rootID);
								}
							}
						}
					});
					function cleanup() {
						if (oldReconcilerMethods !== null) if (renderer.Component) restoreMany(renderer.Component.Mixin, oldReconcilerMethods);
						else restoreMany(renderer.Reconciler, oldReconcilerMethods);
						oldReconcilerMethods = null;
					}
					function recordMount(internalInstance, id, parentID) {
						if (parentID === 0) {
							const hasOwnerMetadata = internalInstance._currentElement != null && internalInstance._currentElement._owner != null;
							pushOperation(TREE_OPERATION_ADD);
							pushOperation(id);
							pushOperation(ElementTypeRoot);
							pushOperation(0);
							pushOperation(0);
							pushOperation(0);
							pushOperation(hasOwnerMetadata ? 1 : 0);
							pushOperation(SUSPENSE_TREE_OPERATION_ADD);
							pushOperation(id);
							pushOperation(parentID);
							pushOperation(getStringID(null));
							pushOperation(0);
							pushOperation(-1);
						} else {
							const type = getElementType(internalInstance);
							const { displayName, key } = getData(internalInstance);
							const ownerID = internalInstance._currentElement != null && internalInstance._currentElement._owner != null ? getID(internalInstance._currentElement._owner) : 0;
							const displayNameStringID = getStringID(displayName);
							const keyStringID = getStringID(key);
							pushOperation(TREE_OPERATION_ADD);
							pushOperation(id);
							pushOperation(type);
							pushOperation(parentID);
							pushOperation(ownerID);
							pushOperation(displayNameStringID);
							pushOperation(keyStringID);
							pushOperation(getStringID(null));
						}
					}
					function recordReorder(internalInstance, id, nextChildren) {
						pushOperation(TREE_OPERATION_REORDER_CHILDREN);
						pushOperation(id);
						const nextChildIDs = nextChildren.map(getID);
						pushOperation(nextChildIDs.length);
						for (let i = 0; i < nextChildIDs.length; i++) pushOperation(nextChildIDs[i]);
					}
					function recordUnmount(internalInstance, id) {
						if (parentIDStack.length === 0) pendingUnmountedRootID = id;
						else pendingUnmountedIDs.push(id);
						idToInternalInstanceMap.delete(id);
					}
					function crawlAndRecordInitialMounts(id, parentID, rootID) {
						const internalInstance = idToInternalInstanceMap.get(id);
						if (internalInstance != null) {
							internalInstanceToRootIDMap.set(internalInstance, rootID);
							recordMount(internalInstance, id, parentID);
							getChildren(internalInstance).forEach((child) => crawlAndRecordInitialMounts(getID(child), id, rootID));
						}
					}
					function flushInitialOperations() {
						const roots = renderer.Mount._instancesByReactRootID || renderer.Mount._instancesByContainerID;
						for (const key in roots) {
							const internalInstance = roots[key];
							const id = getID(internalInstance);
							crawlAndRecordInitialMounts(id, 0, id);
							flushPendingEvents(id);
						}
					}
					const pendingOperations = [];
					const pendingStringTable = /* @__PURE__ */ new Map();
					let pendingUnmountedIDs = [];
					let pendingStringTableLength = 0;
					let pendingUnmountedRootID = null;
					function flushPendingEvents(rootID) {
						if (pendingOperations.length === 0 && pendingUnmountedIDs.length === 0 && pendingUnmountedRootID === null) return;
						const numUnmountIDs = pendingUnmountedIDs.length + (pendingUnmountedRootID === null ? 0 : 1);
						const operations = new Array(3 + pendingStringTableLength + (numUnmountIDs > 0 ? 2 + numUnmountIDs : 0) + (pendingUnmountedRootID === null ? 0 : 3) + pendingOperations.length);
						let i = 0;
						operations[i++] = rendererID;
						operations[i++] = rootID;
						operations[i++] = pendingStringTableLength;
						pendingStringTable.forEach((value, key) => {
							operations[i++] = key.length;
							const encodedKey = utfEncodeString(key);
							for (let j = 0; j < encodedKey.length; j++) operations[i + j] = encodedKey[j];
							i += key.length;
						});
						if (numUnmountIDs > 0) {
							operations[i++] = TREE_OPERATION_REMOVE;
							operations[i++] = numUnmountIDs;
							for (let j = 0; j < pendingUnmountedIDs.length; j++) operations[i++] = pendingUnmountedIDs[j];
							if (pendingUnmountedRootID !== null) {
								operations[i] = pendingUnmountedRootID;
								i++;
								operations[i++] = SUSPENSE_TREE_OPERATION_REMOVE;
								operations[i++] = 1;
								operations[i++] = pendingUnmountedRootID;
							}
						}
						for (let j = 0; j < pendingOperations.length; j++) operations[i + j] = pendingOperations[j];
						i += pendingOperations.length;
						hook.emit("operations", operations);
						pendingOperations.length = 0;
						pendingUnmountedIDs = [];
						pendingUnmountedRootID = null;
						pendingStringTable.clear();
						pendingStringTableLength = 0;
					}
					function pushOperation(op) {
						pendingOperations.push(op);
					}
					function getStringID(str) {
						if (str === null) return 0;
						const existingID = pendingStringTable.get(str);
						if (existingID !== void 0) return existingID;
						const stringID = pendingStringTable.size + 1;
						pendingStringTable.set(str, stringID);
						pendingStringTableLength += str.length + 1;
						return stringID;
					}
					let currentlyInspectedElementID = null;
					let currentlyInspectedPaths = {};
					function mergeInspectedPaths(path) {
						let current = currentlyInspectedPaths;
						path.forEach((key) => {
							if (!current[key]) current[key] = {};
							current = current[key];
						});
					}
					function createIsPathAllowed(key) {
						return function isPathAllowed(path) {
							let current = currentlyInspectedPaths[key];
							if (!current) return false;
							for (let i = 0; i < path.length; i++) {
								current = current[path[i]];
								if (!current) return false;
							}
							return true;
						};
					}
					function getInstanceAndStyle(id) {
						let instance = null;
						let style = null;
						const internalInstance = idToInternalInstanceMap.get(id);
						if (internalInstance != null) {
							instance = internalInstance._instance || null;
							const element = internalInstance._currentElement;
							if (element != null && element.props != null) style = element.props.style || null;
						}
						return {
							instance,
							style
						};
					}
					function updateSelectedElement(id) {
						const internalInstance = idToInternalInstanceMap.get(id);
						if (internalInstance == null) {
							console.warn(`Could not find instance with id "${id}"`);
							return;
						}
						switch (getElementType(internalInstance)) {
							case types_ElementTypeClass:
								global.$r = internalInstance._instance;
								break;
							case types_ElementTypeFunction:
								const element = internalInstance._currentElement;
								if (element == null) {
									console.warn(`Could not find element with id "${id}"`);
									return;
								}
								global.$r = {
									props: element.props,
									type: element.type
								};
								break;
							default:
								global.$r = null;
								break;
						}
					}
					function storeAsGlobal(id, path, count) {
						const inspectedElement = inspectElementRaw(id);
						if (inspectedElement !== null) {
							const value = utils_getInObject(inspectedElement, path);
							const key = `$reactTemp${count}`;
							window[key] = value;
							console.log(key);
							console.log(value);
						}
					}
					function getSerializedElementValueByPath(id, path) {
						const inspectedElement = inspectElementRaw(id);
						if (inspectedElement !== null) return serializeToString(utils_getInObject(inspectedElement, path));
					}
					function inspectElement(requestID, id, path, forceFullData) {
						if (forceFullData || currentlyInspectedElementID !== id) {
							currentlyInspectedElementID = id;
							currentlyInspectedPaths = {};
						}
						const inspectedElement = inspectElementRaw(id);
						if (inspectedElement === null) return {
							id,
							responseID: requestID,
							type: "not-found"
						};
						if (path !== null) mergeInspectedPaths(path);
						updateSelectedElement(id);
						inspectedElement.context = cleanForBridge(inspectedElement.context, createIsPathAllowed("context"));
						inspectedElement.props = cleanForBridge(inspectedElement.props, createIsPathAllowed("props"));
						inspectedElement.state = cleanForBridge(inspectedElement.state, createIsPathAllowed("state"));
						inspectedElement.suspendedBy = cleanForBridge(inspectedElement.suspendedBy, createIsPathAllowed("suspendedBy"));
						return {
							id,
							responseID: requestID,
							type: "full-data",
							value: inspectedElement
						};
					}
					function inspectElementRaw(id) {
						const internalInstance = idToInternalInstanceMap.get(id);
						if (internalInstance == null) return null;
						const rootID = internalInstanceToRootIDMap.get(internalInstance);
						if (rootID === void 0) throw new Error("Expected to find root ID.");
						return rootID === id ? inspectRootsRaw(rootID) : inspectInternalInstanceRaw(id, internalInstance);
					}
					function inspectInternalInstanceRaw(id, internalInstance) {
						const { key } = getData(internalInstance);
						const type = getElementType(internalInstance);
						let context = null;
						let owners = null;
						let props = null;
						let state = null;
						const element = internalInstance._currentElement;
						if (element !== null) {
							props = element.props;
							let owner = element._owner;
							if (owner) {
								owners = [];
								while (owner != null) {
									owners.push({
										displayName: getData(owner).displayName || "Unknown",
										id: getID(owner),
										key: element.key,
										env: null,
										stack: null,
										type: getElementType(owner)
									});
									if (owner._currentElement) owner = owner._currentElement._owner;
								}
							}
						}
						const publicInstance = internalInstance._instance;
						if (publicInstance != null) {
							context = publicInstance.context || null;
							state = publicInstance.state || null;
						}
						return {
							id,
							canEditHooks: false,
							canEditFunctionProps: false,
							canEditHooksAndDeletePaths: false,
							canEditHooksAndRenamePaths: false,
							canEditFunctionPropsDeletePaths: false,
							canEditFunctionPropsRenamePaths: false,
							canToggleError: false,
							isErrored: false,
							canToggleSuspense: false,
							isSuspended: null,
							source: null,
							stack: null,
							hasLegacyContext: true,
							type,
							key: key != null ? key : null,
							context,
							hooks: null,
							props,
							state,
							errors: [],
							warnings: [],
							suspendedBy: [],
							suspendedByRange: null,
							unknownSuspenders: UNKNOWN_SUSPENDERS_NONE,
							owners,
							env: null,
							rootType: null,
							rendererPackageName: null,
							rendererVersion: null,
							plugins: { stylex: null },
							nativeTag: null
						};
					}
					function inspectRootsRaw(arbitraryRootID) {
						const roots = renderer.Mount._instancesByReactRootID || renderer.Mount._instancesByContainerID;
						const inspectedRoots = {
							id: arbitraryRootID,
							type: ElementTypeRoot,
							isErrored: false,
							errors: [],
							warnings: [],
							suspendedBy: [],
							suspendedByRange: null,
							unknownSuspenders: UNKNOWN_SUSPENDERS_NONE,
							rootType: null,
							plugins: { stylex: null },
							nativeTag: null,
							env: null,
							source: null,
							stack: null,
							rendererPackageName: null,
							rendererVersion: null,
							key: null,
							canEditFunctionProps: false,
							canEditHooks: false,
							canEditFunctionPropsDeletePaths: false,
							canEditFunctionPropsRenamePaths: false,
							canEditHooksAndDeletePaths: false,
							canEditHooksAndRenamePaths: false,
							canToggleError: false,
							canToggleSuspense: false,
							isSuspended: false,
							hasLegacyContext: false,
							context: null,
							hooks: null,
							props: null,
							state: null,
							owners: null
						};
						let minSuspendedByRange = Infinity;
						let maxSuspendedByRange = -Infinity;
						for (const rootKey in roots) {
							const internalInstance = roots[rootKey];
							const inspectedRoot = inspectInternalInstanceRaw(getID(internalInstance), internalInstance);
							if (inspectedRoot === null) return null;
							if (inspectedRoot.isErrored) inspectedRoots.isErrored = true;
							for (let i = 0; i < inspectedRoot.errors.length; i++) inspectedRoots.errors.push(inspectedRoot.errors[i]);
							for (let i = 0; i < inspectedRoot.warnings.length; i++) inspectedRoots.warnings.push(inspectedRoot.warnings[i]);
							for (let i = 0; i < inspectedRoot.suspendedBy.length; i++) inspectedRoots.suspendedBy.push(inspectedRoot.suspendedBy[i]);
							const suspendedByRange = inspectedRoot.suspendedByRange;
							if (suspendedByRange !== null) {
								if (suspendedByRange[0] < minSuspendedByRange) minSuspendedByRange = suspendedByRange[0];
								if (suspendedByRange[1] > maxSuspendedByRange) maxSuspendedByRange = suspendedByRange[1];
							}
						}
						if (minSuspendedByRange !== Infinity || maxSuspendedByRange !== -Infinity) inspectedRoots.suspendedByRange = [minSuspendedByRange, maxSuspendedByRange];
						return inspectedRoots;
					}
					function logElementToConsole(id) {
						const result = inspectElementRaw(id);
						if (result === null) {
							console.warn(`Could not find element with id "${id}"`);
							return;
						}
						const displayName = getDisplayNameForElementID(id);
						const supportsGroup = typeof console.groupCollapsed === "function";
						if (supportsGroup) console.groupCollapsed(`[Click to expand] %c<${displayName || "Component"} />`, "color: var(--dom-tag-name-color); font-weight: normal;");
						if (result.props !== null) console.log("Props:", result.props);
						if (result.state !== null) console.log("State:", result.state);
						if (result.context !== null) console.log("Context:", result.context);
						const hostInstance = findHostInstanceForInternalID(id);
						if (hostInstance !== null) console.log("Node:", hostInstance);
						if (window.chrome || /firefox/i.test(navigator.userAgent)) console.log("Right-click any value to save it as a global variable for further inspection.");
						if (supportsGroup) console.groupEnd();
					}
					function getElementAttributeByPath(id, path) {
						const inspectedElement = inspectElementRaw(id);
						if (inspectedElement !== null) return utils_getInObject(inspectedElement, path);
					}
					function getElementSourceFunctionById(id) {
						const internalInstance = idToInternalInstanceMap.get(id);
						if (internalInstance == null) {
							console.warn(`Could not find instance with id "${id}"`);
							return null;
						}
						const element = internalInstance._currentElement;
						if (element == null) {
							console.warn(`Could not find element with id "${id}"`);
							return null;
						}
						return element.type;
					}
					function deletePath(type, id, hookID, path) {
						const internalInstance = idToInternalInstanceMap.get(id);
						if (internalInstance != null) {
							const publicInstance = internalInstance._instance;
							if (publicInstance != null) switch (type) {
								case "context":
									deletePathInObject(publicInstance.context, path);
									forceUpdate(publicInstance);
									break;
								case "hooks": throw new Error("Hooks not supported by this renderer");
								case "props":
									const element = internalInstance._currentElement;
									internalInstance._currentElement = {
										...element,
										props: copyWithDelete(element.props, path)
									};
									forceUpdate(publicInstance);
									break;
								case "state":
									deletePathInObject(publicInstance.state, path);
									forceUpdate(publicInstance);
									break;
							}
						}
					}
					function renamePath(type, id, hookID, oldPath, newPath) {
						const internalInstance = idToInternalInstanceMap.get(id);
						if (internalInstance != null) {
							const publicInstance = internalInstance._instance;
							if (publicInstance != null) switch (type) {
								case "context":
									renamePathInObject(publicInstance.context, oldPath, newPath);
									forceUpdate(publicInstance);
									break;
								case "hooks": throw new Error("Hooks not supported by this renderer");
								case "props":
									const element = internalInstance._currentElement;
									internalInstance._currentElement = {
										...element,
										props: copyWithRename(element.props, oldPath, newPath)
									};
									forceUpdate(publicInstance);
									break;
								case "state":
									renamePathInObject(publicInstance.state, oldPath, newPath);
									forceUpdate(publicInstance);
									break;
							}
						}
					}
					function overrideValueAtPath(type, id, hookID, path, value) {
						const internalInstance = idToInternalInstanceMap.get(id);
						if (internalInstance != null) {
							const publicInstance = internalInstance._instance;
							if (publicInstance != null) switch (type) {
								case "context":
									utils_setInObject(publicInstance.context, path, value);
									forceUpdate(publicInstance);
									break;
								case "hooks": throw new Error("Hooks not supported by this renderer");
								case "props":
									const element = internalInstance._currentElement;
									internalInstance._currentElement = {
										...element,
										props: copyWithSet(element.props, path, value)
									};
									forceUpdate(publicInstance);
									break;
								case "state":
									utils_setInObject(publicInstance.state, path, value);
									forceUpdate(publicInstance);
									break;
							}
						}
					}
					const getProfilingData = () => {
						throw new Error("getProfilingData not supported by this renderer");
					};
					const handleCommitFiberRoot = () => {
						throw new Error("handleCommitFiberRoot not supported by this renderer");
					};
					const handleCommitFiberUnmount = () => {
						throw new Error("handleCommitFiberUnmount not supported by this renderer");
					};
					const handlePostCommitFiberRoot = () => {
						throw new Error("handlePostCommitFiberRoot not supported by this renderer");
					};
					const overrideError = () => {
						throw new Error("overrideError not supported by this renderer");
					};
					const overrideSuspense = () => {
						throw new Error("overrideSuspense not supported by this renderer");
					};
					const overrideSuspenseMilestone = () => {
						throw new Error("overrideSuspenseMilestone not supported by this renderer");
					};
					const startProfiling = () => {};
					const stopProfiling = () => {};
					function getBestMatchForTrackedPath() {
						return null;
					}
					function getPathForElement(id) {
						return null;
					}
					function updateComponentFilters(componentFilters) {}
					function getEnvironmentNames() {
						return [];
					}
					function setTraceUpdatesEnabled(enabled) {}
					function setTrackedPath(path) {}
					function getOwnersList(id) {
						return null;
					}
					function clearErrorsAndWarnings() {}
					function clearErrorsForElementID(id) {}
					function clearWarningsForElementID(id) {}
					function hasElementWithId(id) {
						return idToInternalInstanceMap.has(id);
					}
					return {
						clearErrorsAndWarnings,
						clearErrorsForElementID,
						clearWarningsForElementID,
						cleanup,
						getSerializedElementValueByPath,
						deletePath,
						flushInitialOperations,
						getBestMatchForTrackedPath,
						getDisplayNameForElementID,
						getNearestMountedDOMNode,
						getElementIDForHostInstance,
						getSuspenseNodeIDForHostInstance(id) {
							return null;
						},
						getInstanceAndStyle,
						findHostInstancesForElementID: (id) => {
							const hostInstance = findHostInstanceForInternalID(id);
							return hostInstance == null ? null : [hostInstance];
						},
						findLastKnownRectsForID() {
							return null;
						},
						getOwnersList,
						getPathForElement,
						getProfilingData,
						handleCommitFiberRoot,
						handleCommitFiberUnmount,
						handlePostCommitFiberRoot,
						hasElementWithId,
						inspectElement,
						logElementToConsole,
						overrideError,
						overrideSuspense,
						overrideSuspenseMilestone,
						overrideValueAtPath,
						renamePath,
						getElementAttributeByPath,
						getElementSourceFunctionById,
						renderer,
						setTraceUpdatesEnabled,
						setTrackedPath,
						startProfiling,
						stopProfiling,
						storeAsGlobal,
						supportsTogglingSuspense,
						updateComponentFilters,
						getEnvironmentNames
					};
				}
				function isMatchingRender(version) {
					return !hasAssignedBackend(version);
				}
				function attachRenderer(hook, id, renderer, global, shouldStartProfilingNow, profilingSettings) {
					if (!isMatchingRender(renderer.reconcilerVersion || renderer.version)) return;
					let rendererInterface = hook.rendererInterfaces.get(id);
					if (rendererInterface == null) {
						if (typeof renderer.getCurrentComponentInfo === "function") rendererInterface = attach(hook, id, renderer, global);
						else if (typeof renderer.findFiberByHostInstance === "function" || renderer.currentDispatcherRef != null) rendererInterface = renderer_attach(hook, id, renderer, global, shouldStartProfilingNow, profilingSettings);
						else if (renderer.ComponentTree) rendererInterface = legacy_renderer_attach(hook, id, renderer, global);
					}
					return rendererInterface;
				}
				function formatConsoleArguments(maybeMessage, ...inputArgs) {
					if (inputArgs.length === 0 || typeof maybeMessage !== "string") return [maybeMessage, ...inputArgs];
					const args = inputArgs.slice();
					let template = "";
					let argumentsPointer = 0;
					for (let i = 0; i < maybeMessage.length; ++i) {
						const currentChar = maybeMessage[i];
						if (currentChar !== "%") {
							template += currentChar;
							continue;
						}
						const nextChar = maybeMessage[i + 1];
						++i;
						switch (nextChar) {
							case "c":
							case "O":
							case "o":
								++argumentsPointer;
								template += `%${nextChar}`;
								break;
							case "d":
							case "i": {
								const [arg] = args.splice(argumentsPointer, 1);
								template += parseInt(arg, 10).toString();
								break;
							}
							case "f": {
								const [arg] = args.splice(argumentsPointer, 1);
								template += parseFloat(arg).toString();
								break;
							}
							case "s": {
								const [arg] = args.splice(argumentsPointer, 1);
								template += String(arg);
								break;
							}
							default: template += `%${nextChar}`;
						}
					}
					return [template, ...args];
				}
				const PREFIX_REGEX = /\s{4}(in|at)\s{1}/;
				const ROW_COLUMN_NUMBER_REGEX = /:\d+:\d+(\n|$)/;
				function isStringComponentStack(text) {
					return PREFIX_REGEX.test(text) || ROW_COLUMN_NUMBER_REGEX.test(text);
				}
				const frameDiffs = / \(\<anonymous\>\)$|\@unknown\:0\:0$|\(|\)|\[|\]/gm;
				function areStackTracesEqual(a, b) {
					return a.replace(frameDiffs, "") === b.replace(frameDiffs, "");
				}
				const targetConsole = console;
				const defaultProfilingSettings = {
					recordChangeDescriptions: false,
					recordTimeline: false
				};
				function installHook(target, maybeSettingsOrSettingsPromise, shouldStartProfilingNow = false, profilingSettings = defaultProfilingSettings) {
					if (target.hasOwnProperty("__REACT_DEVTOOLS_GLOBAL_HOOK__")) return null;
					function detectReactBuildType(renderer) {
						try {
							if (typeof renderer.version === "string") {
								if (renderer.bundleType > 0) return "development";
								return "production";
							}
							const toString = Function.prototype.toString;
							if (renderer.Mount && renderer.Mount._renderNewRootComponent) {
								const renderRootCode = toString.call(renderer.Mount._renderNewRootComponent);
								if (renderRootCode.indexOf("function") !== 0) return "production";
								if (renderRootCode.indexOf("storedMeasure") !== -1) return "development";
								if (renderRootCode.indexOf("should be a pure function") !== -1) {
									if (renderRootCode.indexOf("NODE_ENV") !== -1) return "development";
									if (renderRootCode.indexOf("development") !== -1) return "development";
									if (renderRootCode.indexOf("true") !== -1) return "development";
									if (renderRootCode.indexOf("nextElement") !== -1 || renderRootCode.indexOf("nextComponent") !== -1) return "unminified";
									else return "development";
								}
								if (renderRootCode.indexOf("nextElement") !== -1 || renderRootCode.indexOf("nextComponent") !== -1) return "unminified";
								return "outdated";
							}
						} catch (err) {}
						return "production";
					}
					function checkDCE(fn) {
						try {
							if (Function.prototype.toString.call(fn).indexOf("^_^") > -1) {
								hasDetectedBadDCE = true;
								setTimeout(function() {
									throw new Error("React is running in production mode, but dead code elimination has not been applied. Read how to correctly configure React for production: https://react.dev/link/perf-use-production-build");
								});
							}
						} catch (err) {}
					}
					const isProfiling = shouldStartProfilingNow;
					let uidCounter = 0;
					function inject(renderer) {
						const id = ++uidCounter;
						renderers.set(id, renderer);
						const reactBuildType = hasDetectedBadDCE ? "deadcode" : detectReactBuildType(renderer);
						hook.emit("renderer", {
							id,
							renderer,
							reactBuildType
						});
						const rendererInterface = attachRenderer(hook, id, renderer, target, isProfiling, profilingSettings);
						if (rendererInterface != null) {
							hook.rendererInterfaces.set(id, rendererInterface);
							hook.emit("renderer-attached", {
								id,
								rendererInterface
							});
						} else {
							hook.hasUnsupportedRendererAttached = true;
							hook.emit("unsupported-renderer-version");
						}
						return id;
					}
					let hasDetectedBadDCE = false;
					function sub(event, fn) {
						hook.on(event, fn);
						return () => hook.off(event, fn);
					}
					function on(event, fn) {
						if (!listeners[event]) listeners[event] = [];
						listeners[event].push(fn);
					}
					function off(event, fn) {
						if (!listeners[event]) return;
						const index = listeners[event].indexOf(fn);
						if (index !== -1) listeners[event].splice(index, 1);
						if (!listeners[event].length) delete listeners[event];
					}
					function emit(event, data) {
						if (listeners[event]) listeners[event].map((fn) => fn(data));
					}
					function getFiberRoots(rendererID) {
						const roots = fiberRoots;
						if (!roots[rendererID]) roots[rendererID] = /* @__PURE__ */ new Set();
						return roots[rendererID];
					}
					function onCommitFiberUnmount(rendererID, fiber) {
						const rendererInterface = rendererInterfaces.get(rendererID);
						if (rendererInterface != null) rendererInterface.handleCommitFiberUnmount(fiber);
					}
					function onCommitFiberRoot(rendererID, root, priorityLevel) {
						const mountedRoots = hook.getFiberRoots(rendererID);
						const current = root.current;
						const isKnownRoot = mountedRoots.has(root);
						const isUnmounting = current.memoizedState == null || current.memoizedState.element == null;
						if (!isKnownRoot && !isUnmounting) mountedRoots.add(root);
						else if (isKnownRoot && isUnmounting) mountedRoots.delete(root);
						const rendererInterface = rendererInterfaces.get(rendererID);
						if (rendererInterface != null) rendererInterface.handleCommitFiberRoot(root, priorityLevel);
					}
					function onPostCommitFiberRoot(rendererID, root) {
						const rendererInterface = rendererInterfaces.get(rendererID);
						if (rendererInterface != null) rendererInterface.handlePostCommitFiberRoot(root);
					}
					let isRunningDuringStrictModeInvocation = false;
					function setStrictMode(rendererID, isStrictMode) {
						isRunningDuringStrictModeInvocation = isStrictMode;
						if (isStrictMode) patchConsoleForStrictMode();
						else unpatchConsoleForStrictMode();
					}
					const unpatchConsoleCallbacks = [];
					function patchConsoleForStrictMode() {
						if (!hook.settings) return;
						if (unpatchConsoleCallbacks.length > 0) return;
						for (const method of [
							"group",
							"groupCollapsed",
							"info",
							"log"
						]) {
							const originalMethod = targetConsole[method];
							const overrideMethod = (...args) => {
								const settings = hook.settings;
								if (settings == null) {
									originalMethod(...args);
									return;
								}
								if (settings.hideConsoleLogsInStrictMode) return;
								originalMethod(ANSI_STYLE_DIMMING_TEMPLATE, ...formatConsoleArguments(...args));
							};
							targetConsole[method] = overrideMethod;
							unpatchConsoleCallbacks.push(() => {
								targetConsole[method] = originalMethod;
							});
						}
					}
					function unpatchConsoleForStrictMode() {
						unpatchConsoleCallbacks.forEach((callback) => callback());
						unpatchConsoleCallbacks.length = 0;
					}
					const openModuleRangesStack = [];
					const moduleRanges = [];
					function getTopStackFrameString(error) {
						const frames = error.stack.split("\n");
						return frames.length > 1 ? frames[1] : null;
					}
					function getInternalModuleRanges() {
						return moduleRanges;
					}
					function registerInternalModuleStart(error) {
						const startStackFrame = getTopStackFrameString(error);
						if (startStackFrame !== null) openModuleRangesStack.push(startStackFrame);
					}
					function registerInternalModuleStop(error) {
						if (openModuleRangesStack.length > 0) {
							const startStackFrame = openModuleRangesStack.pop();
							const stopStackFrame = getTopStackFrameString(error);
							if (stopStackFrame !== null) moduleRanges.push([startStackFrame, stopStackFrame]);
						}
					}
					function patchConsoleForErrorsAndWarnings() {
						if (!hook.settings) return;
						for (const method of [
							"error",
							"trace",
							"warn"
						]) {
							const originalMethod = targetConsole[method];
							const overrideMethod = (...args) => {
								const settings = hook.settings;
								if (settings == null) {
									originalMethod(...args);
									return;
								}
								if (isRunningDuringStrictModeInvocation && settings.hideConsoleLogsInStrictMode) return;
								let injectedComponentStackAsFakeError = false;
								let alreadyHasComponentStack = false;
								if (settings.appendComponentStack) {
									const lastArg = args.length > 0 ? args[args.length - 1] : null;
									alreadyHasComponentStack = typeof lastArg === "string" && isStringComponentStack(lastArg);
								}
								const shouldShowInlineWarningsAndErrors = settings.showInlineWarningsAndErrors && (method === "error" || method === "warn");
								for (const rendererInterface of hook.rendererInterfaces.values()) {
									const { onErrorOrWarning, getComponentStack } = rendererInterface;
									try {
										if (shouldShowInlineWarningsAndErrors) {
											if (onErrorOrWarning != null) onErrorOrWarning(method, args.slice());
										}
									} catch (error) {
										setTimeout(() => {
											throw error;
										}, 0);
									}
									try {
										if (settings.appendComponentStack && getComponentStack != null) {
											const match = getComponentStack(Error("react-stack-top-frame"));
											if (match !== null) {
												const { enableOwnerStacks, componentStack } = match;
												if (componentStack !== "") {
													const fakeError = /* @__PURE__ */ new Error("");
													fakeError.name = enableOwnerStacks ? "Stack" : "Component Stack";
													fakeError.stack = componentStack;
													if (alreadyHasComponentStack) {
														if (areStackTracesEqual(args[args.length - 1], componentStack)) {
															const firstArg = args[0];
															if (args.length > 1 && typeof firstArg === "string" && firstArg.endsWith("%s")) args[0] = firstArg.slice(0, firstArg.length - 2);
															args[args.length - 1] = fakeError;
															injectedComponentStackAsFakeError = true;
														}
													} else {
														args.push(fakeError);
														injectedComponentStackAsFakeError = true;
													}
												}
												break;
											}
										}
									} catch (error) {
										setTimeout(() => {
											throw error;
										}, 0);
									}
								}
								if (settings.breakOnConsoleErrors) debugger;
								if (isRunningDuringStrictModeInvocation) originalMethod(injectedComponentStackAsFakeError ? ANSI_STYLE_DIMMING_TEMPLATE_WITH_COMPONENT_STACK : ANSI_STYLE_DIMMING_TEMPLATE, ...formatConsoleArguments(...args));
								else originalMethod(...args);
							};
							targetConsole[method] = overrideMethod;
						}
					}
					const fiberRoots = {};
					const rendererInterfaces = /* @__PURE__ */ new Map();
					const listeners = {};
					const renderers = /* @__PURE__ */ new Map();
					const hook = {
						rendererInterfaces,
						listeners,
						backends: /* @__PURE__ */ new Map(),
						renderers,
						hasUnsupportedRendererAttached: false,
						emit,
						getFiberRoots,
						inject,
						on,
						off,
						sub,
						supportsFiber: true,
						supportsFlight: true,
						checkDCE,
						onCommitFiberUnmount,
						onCommitFiberRoot,
						onPostCommitFiberRoot,
						setStrictMode,
						getInternalModuleRanges,
						registerInternalModuleStart,
						registerInternalModuleStop
					};
					if (maybeSettingsOrSettingsPromise == null) {
						hook.settings = {
							appendComponentStack: true,
							breakOnConsoleErrors: false,
							showInlineWarningsAndErrors: true,
							hideConsoleLogsInStrictMode: false
						};
						patchConsoleForErrorsAndWarnings();
					} else Promise.resolve(maybeSettingsOrSettingsPromise).then((settings) => {
						hook.settings = settings;
						hook.emit("settingsInitialized", settings);
						patchConsoleForErrorsAndWarnings();
					}).catch(() => {
						targetConsole.error("React DevTools failed to get Console Patching settings. Console won't be patched and some console features will not work.");
					});
					Object.defineProperty(target, "__REACT_DEVTOOLS_GLOBAL_HOOK__", {
						configurable: false,
						enumerable: false,
						get() {
							return hook;
						}
					});
					return hook;
				}
				function resolveBoxStyle(prefix, style) {
					let hasParts = false;
					const result = {
						bottom: 0,
						left: 0,
						right: 0,
						top: 0
					};
					const styleForAll = style[prefix];
					if (styleForAll != null) {
						for (const key of Object.keys(result)) result[key] = styleForAll;
						hasParts = true;
					}
					const styleForHorizontal = style[prefix + "Horizontal"];
					if (styleForHorizontal != null) {
						result.left = styleForHorizontal;
						result.right = styleForHorizontal;
						hasParts = true;
					} else {
						const styleForLeft = style[prefix + "Left"];
						if (styleForLeft != null) {
							result.left = styleForLeft;
							hasParts = true;
						}
						const styleForRight = style[prefix + "Right"];
						if (styleForRight != null) {
							result.right = styleForRight;
							hasParts = true;
						}
						const styleForEnd = style[prefix + "End"];
						if (styleForEnd != null) {
							result.right = styleForEnd;
							hasParts = true;
						}
						const styleForStart = style[prefix + "Start"];
						if (styleForStart != null) {
							result.left = styleForStart;
							hasParts = true;
						}
					}
					const styleForVertical = style[prefix + "Vertical"];
					if (styleForVertical != null) {
						result.bottom = styleForVertical;
						result.top = styleForVertical;
						hasParts = true;
					} else {
						const styleForBottom = style[prefix + "Bottom"];
						if (styleForBottom != null) {
							result.bottom = styleForBottom;
							hasParts = true;
						}
						const styleForTop = style[prefix + "Top"];
						if (styleForTop != null) {
							result.top = styleForTop;
							hasParts = true;
						}
					}
					return hasParts ? result : null;
				}
				function setupNativeStyleEditor(bridge, agent, resolveNativeStyle, validAttributes) {
					bridge.addListener("NativeStyleEditor_measure", ({ id, rendererID }) => {
						measureStyle(agent, bridge, resolveNativeStyle, id, rendererID);
					});
					bridge.addListener("NativeStyleEditor_renameAttribute", ({ id, rendererID, oldName, newName, value }) => {
						renameStyle(agent, id, rendererID, oldName, newName, value);
						setTimeout(() => measureStyle(agent, bridge, resolveNativeStyle, id, rendererID));
					});
					bridge.addListener("NativeStyleEditor_setValue", ({ id, rendererID, name, value }) => {
						setStyle(agent, id, rendererID, name, value);
						setTimeout(() => measureStyle(agent, bridge, resolveNativeStyle, id, rendererID));
					});
					bridge.send("isNativeStyleEditorSupported", {
						isSupported: true,
						validAttributes
					});
				}
				const EMPTY_BOX_STYLE = {
					top: 0,
					left: 0,
					right: 0,
					bottom: 0
				};
				const componentIDToStyleOverrides = /* @__PURE__ */ new Map();
				function measureStyle(agent, bridge, resolveNativeStyle, id, rendererID) {
					const data = agent.getInstanceAndStyle({
						id,
						rendererID
					});
					if (!data || !data.style) {
						bridge.send("NativeStyleEditor_styleAndLayout", {
							id,
							layout: null,
							style: null
						});
						return;
					}
					const { instance, style } = data;
					let resolvedStyle = resolveNativeStyle(style);
					const styleOverrides = componentIDToStyleOverrides.get(id);
					if (styleOverrides != null) resolvedStyle = Object.assign({}, resolvedStyle, styleOverrides);
					if (!instance || typeof instance.measure !== "function") {
						bridge.send("NativeStyleEditor_styleAndLayout", {
							id,
							layout: null,
							style: resolvedStyle || null
						});
						return;
					}
					instance.measure((x, y, width, height, left, top) => {
						if (typeof x !== "number") {
							bridge.send("NativeStyleEditor_styleAndLayout", {
								id,
								layout: null,
								style: resolvedStyle || null
							});
							return;
						}
						const margin = resolvedStyle != null && resolveBoxStyle("margin", resolvedStyle) || EMPTY_BOX_STYLE;
						const padding = resolvedStyle != null && resolveBoxStyle("padding", resolvedStyle) || EMPTY_BOX_STYLE;
						bridge.send("NativeStyleEditor_styleAndLayout", {
							id,
							layout: {
								x,
								y,
								width,
								height,
								left,
								top,
								margin,
								padding
							},
							style: resolvedStyle || null
						});
					});
				}
				function shallowClone(object) {
					const cloned = {};
					for (const n in object) cloned[n] = object[n];
					return cloned;
				}
				function renameStyle(agent, id, rendererID, oldName, newName, value) {
					const data = agent.getInstanceAndStyle({
						id,
						rendererID
					});
					if (!data || !data.style) return;
					const { instance, style } = data;
					const newStyle = newName ? {
						[oldName]: void 0,
						[newName]: value
					} : { [oldName]: void 0 };
					let customStyle;
					if (instance !== null && typeof instance.setNativeProps === "function") {
						const styleOverrides = componentIDToStyleOverrides.get(id);
						if (!styleOverrides) componentIDToStyleOverrides.set(id, newStyle);
						else Object.assign(styleOverrides, newStyle);
						instance.setNativeProps({ style: newStyle });
					} else if (src_isArray(style)) {
						const lastIndex = style.length - 1;
						if (typeof style[lastIndex] === "object" && !src_isArray(style[lastIndex])) {
							customStyle = shallowClone(style[lastIndex]);
							delete customStyle[oldName];
							if (newName) customStyle[newName] = value;
							else customStyle[oldName] = void 0;
							agent.overrideValueAtPath({
								type: "props",
								id,
								rendererID,
								path: ["style", lastIndex],
								value: customStyle
							});
						} else agent.overrideValueAtPath({
							type: "props",
							id,
							rendererID,
							path: ["style"],
							value: style.concat([newStyle])
						});
					} else if (typeof style === "object") {
						customStyle = shallowClone(style);
						delete customStyle[oldName];
						if (newName) customStyle[newName] = value;
						else customStyle[oldName] = void 0;
						agent.overrideValueAtPath({
							type: "props",
							id,
							rendererID,
							path: ["style"],
							value: customStyle
						});
					} else agent.overrideValueAtPath({
						type: "props",
						id,
						rendererID,
						path: ["style"],
						value: [style, newStyle]
					});
					agent.emit("hideNativeHighlight");
				}
				function setStyle(agent, id, rendererID, name, value) {
					const data = agent.getInstanceAndStyle({
						id,
						rendererID
					});
					if (!data || !data.style) return;
					const { instance, style } = data;
					const newStyle = { [name]: value };
					if (instance !== null && typeof instance.setNativeProps === "function") {
						const styleOverrides = componentIDToStyleOverrides.get(id);
						if (!styleOverrides) componentIDToStyleOverrides.set(id, newStyle);
						else Object.assign(styleOverrides, newStyle);
						instance.setNativeProps({ style: newStyle });
					} else if (src_isArray(style)) {
						const lastLength = style.length - 1;
						if (typeof style[lastLength] === "object" && !src_isArray(style[lastLength])) agent.overrideValueAtPath({
							type: "props",
							id,
							rendererID,
							path: [
								"style",
								lastLength,
								name
							],
							value
						});
						else agent.overrideValueAtPath({
							type: "props",
							id,
							rendererID,
							path: ["style"],
							value: style.concat([newStyle])
						});
					} else agent.overrideValueAtPath({
						type: "props",
						id,
						rendererID,
						path: ["style"],
						value: [style, newStyle]
					});
					agent.emit("hideNativeHighlight");
				}
				function startActivation(contentWindow, bridge) {
					const onSavedPreferences = (data) => {
						bridge.removeListener("savedPreferences", onSavedPreferences);
						const { appendComponentStack, breakOnConsoleErrors, componentFilters, showInlineWarningsAndErrors, hideConsoleLogsInStrictMode } = data;
						contentWindow.__REACT_DEVTOOLS_APPEND_COMPONENT_STACK__ = appendComponentStack;
						contentWindow.__REACT_DEVTOOLS_BREAK_ON_CONSOLE_ERRORS__ = breakOnConsoleErrors;
						contentWindow.__REACT_DEVTOOLS_COMPONENT_FILTERS__ = componentFilters;
						contentWindow.__REACT_DEVTOOLS_SHOW_INLINE_WARNINGS_AND_ERRORS__ = showInlineWarningsAndErrors;
						contentWindow.__REACT_DEVTOOLS_HIDE_CONSOLE_LOGS_IN_STRICT_MODE__ = hideConsoleLogsInStrictMode;
						if (contentWindow !== window) {
							window.__REACT_DEVTOOLS_APPEND_COMPONENT_STACK__ = appendComponentStack;
							window.__REACT_DEVTOOLS_BREAK_ON_CONSOLE_ERRORS__ = breakOnConsoleErrors;
							window.__REACT_DEVTOOLS_COMPONENT_FILTERS__ = componentFilters;
							window.__REACT_DEVTOOLS_SHOW_INLINE_WARNINGS_AND_ERRORS__ = showInlineWarningsAndErrors;
							window.__REACT_DEVTOOLS_HIDE_CONSOLE_LOGS_IN_STRICT_MODE__ = hideConsoleLogsInStrictMode;
						}
						finishActivation(contentWindow, bridge);
					};
					bridge.addListener("savedPreferences", onSavedPreferences);
					bridge.send("getSavedPreferences");
				}
				function finishActivation(contentWindow, bridge) {
					const agent = new Agent(bridge, getIfReloadedAndProfiling(), onReloadAndProfile);
					onReloadAndProfileFlagsReset();
					const hook = contentWindow.__REACT_DEVTOOLS_GLOBAL_HOOK__;
					if (hook) {
						initBackend(hook, agent, contentWindow, getIsReloadAndProfileSupported());
						if (hook.resolveRNStyle) setupNativeStyleEditor(bridge, agent, hook.resolveRNStyle, hook.nativeStyleEditorValidAttributes);
					}
				}
				function activate(contentWindow, { bridge } = {}) {
					if (bridge == null) bridge = createBridge(contentWindow);
					startActivation(contentWindow, bridge);
				}
				function createBridge(contentWindow, wall) {
					const { parent } = contentWindow;
					if (wall == null) wall = {
						listen(fn) {
							const onMessage = ({ data }) => {
								fn(data);
							};
							contentWindow.addEventListener("message", onMessage);
							return () => {
								contentWindow.removeEventListener("message", onMessage);
							};
						},
						send(event, payload, transferable) {
							parent.postMessage({
								event,
								payload
							}, "*", transferable);
						}
					};
					return new bridge(wall);
				}
				function backend_initialize(contentWindow) {
					installHook(contentWindow);
				}
			})();
			module.exports = __webpack_exports__;
		})();
	}));
	//#endregion
	//#region backend-entry.js
	var import_backend = (/* @__PURE__ */ __commonJSMin(((exports, module) => {
		module.exports = require_backend$1();
	})))();
	window.FoaeReactDevToolsBackend = {
		activate: import_backend.activate,
		createBridge: import_backend.createBridge,
		initialize: import_backend.initialize
	};
	//#endregion
})();
