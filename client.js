window.__ModuleLoader__.load({
  id: '@local/dsh-session-skills',
  factory(require) {
    const React = require('react');
    const { createPortal } = require('react-dom');
    const { useState, useEffect, useRef, useLayoutEffect } = React;
    const h = React.createElement;
    const NS = 'local.sessionSkills';
    const zh = {
      button: '技能', title: '选择技能', search: '搜索技能', empty: '没有匹配的技能',
      loading: '正在读取技能', failed: '读取技能失败', retry: '重试', refresh: '刷新技能',
      clear: '清空', cancel: '取消', apply: '确定', selected: '已选 {count} 项',
      locked: '请等待当前发送完成', command: '请先完成或清空当前命令',
      readOnly: '当前会话不可编辑', noCatalog: '当前会话没有可用技能',
      chosen: '已选择：{names}', remove: '移除 {name}'
    };
    const en = {
      button: 'Skills', title: 'Select Skills', search: 'Search skills', empty: 'No matching skills',
      loading: 'Loading skills', failed: 'Could not load skills', retry: 'Retry', refresh: 'Refresh skills',
      clear: 'Clear', cancel: 'Cancel', apply: 'Apply', selected: '{count} selected',
      locked: 'Wait for the current submission to finish', command: 'Finish or clear the current command first',
      readOnly: 'This session is read-only', noCatalog: 'No skills are available in this session',
      chosen: 'Selected: {names}', remove: 'Remove {name}'
    };

    function semanticDraft(input) {
      return {
        text: input.draft,
        references: (input.occurrences || []).map(({ offset, length, source, ref, label, appearance, clipboardText, invalid }) => ({
          offset, length, source, ref, label, clipboardText,
          ...(appearance === undefined ? {} : { appearance }),
          ...(invalid === undefined ? {} : { invalid })
        })),
        ...(input.claim ? { command: { token: input.claim.token } } : {})
      };
    }

    // Only a still-intact prefix inserted by this instance may be replaced.
    function withSkills(input, previousPrefix, names) {
      const draft = semanticDraft(input);
      const removed = previousPrefix && draft.text.startsWith(previousPrefix) ? previousPrefix.length : 0;
      const body = draft.text.slice(removed);
      const existing = new Set([...body.matchAll(/(^|\s)\/([a-z0-9]+(?:-[a-z0-9]+)*)(?=\s|$)/g)].map(match => match[2]));
      const newNames = names.filter(name => !existing.has(name));
      const prefix = newNames.length ? 'Skills: ' + newNames.map(name => `/${name}`).join(' ') + '\n' : '';
      const references = draft.references.filter(ref => ref.offset >= removed).map(ref => ({
        ...ref, offset: ref.offset - removed + prefix.length
      }));
      // Skills are editable slash references, not serialized file-reference chips.
      return { draft: { ...draft, text: prefix + body, references }, prefix };
    }

    const css = `
.dss-root{position:relative;display:inline-flex;flex:none;min-width:0;font-size:13px;letter-spacing:0;color:var(--dsw-alias-label-secondary);font-family:inherit}
.dss-root *{box-sizing:border-box;letter-spacing:0}
.dss-button,.dss-icon,.dss-command{font:inherit;color:inherit;border:0;cursor:pointer;background:transparent}
.dss-button{height:28px;padding:0 7px;display:inline-flex;align-items:center;gap:5px;border-radius:6px;white-space:nowrap}
.dss-button:hover,.dss-icon:hover,.dss-row:hover,.dss-command:hover{background:var(--dsw-alias-interactive-bg-hover-solid)}
.dss-button[data-selected=true]{color:var(--dsw-alias-state-business-primary)}
.dss-button:disabled,.dss-command:disabled,.dss-icon:disabled{opacity:.5;cursor:default}
.dss-button:focus-visible,.dss-icon:focus-visible,.dss-command:focus-visible,.dss-row:focus-within{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}
.dss-count{font-size:11px;min-width:16px;height:16px;border-radius:4px;display:inline-flex;justify-content:center;align-items:center;background:var(--dsw-alias-interactive-bg-hover-solid)}
.dss-panel{position:fixed;z-index:1000;box-sizing:border-box;width:360px;max-width:calc(100vw - 24px);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);box-shadow:var(--dsw-elevation-panel);display:flex;flex-direction:column;overflow:hidden;font-size:13px;letter-spacing:0;font-family:inherit}
.dss-panel *{box-sizing:border-box;letter-spacing:0}
.dss-head,.dss-foot{display:flex;align-items:center;gap:8px;padding:10px 12px;flex:none}
.dss-head{justify-content:space-between;font-weight:500}
.dss-icon{width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;border-radius:4px;flex:none}
.dss-search{margin:0 12px 8px;display:flex;align-items:center;gap:7px;border:1px solid var(--dsw-alias-border-l2);border-radius:5px;padding:7px 8px;flex:none;color:var(--dsw-alias-label-tertiary)}
.dss-search:focus-within{border-color:var(--dsw-alias-state-business-primary)}
.dss-search input{min-width:0;width:100%;border:0;outline:0;background:transparent;color:var(--dsw-alias-label-primary);font:inherit}
.dss-list{overflow-y:auto;overscroll-behavior:contain;min-height:60px;max-height:280px;padding:0 5px 5px}
.dss-row{display:flex;align-items:flex-start;gap:9px;border-radius:5px;padding:8px 7px;cursor:pointer;min-width:0}
.dss-row input{width:15px;height:15px;flex:none;margin:2px 0 0;accent-color:var(--dsw-alias-state-business-primary)}
.dss-copy{min-width:0;display:flex;flex-direction:column;gap:3px}
.dss-name{font-size:13px;line-height:18px;overflow-wrap:anywhere}
.dss-desc{font-size:12px;line-height:17px;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.dss-state{padding:22px 12px;text-align:center;color:var(--dsw-alias-label-tertiary);font-size:12px;overflow-wrap:anywhere}
.dss-error{padding:0 12px 8px;color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:17px;overflow-wrap:anywhere}
.dss-foot{border-top:1px solid var(--dsw-alias-border-l2);font-size:12px;flex-wrap:wrap}
.dss-total{color:var(--dsw-alias-label-tertiary);margin-right:auto}
.dss-command{height:27px;padding:0 8px;border-radius:4px;white-space:nowrap}
.dss-primary{background:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-label-on-color,#fff)}
.dss-primary:hover{background:var(--dsw-alias-state-business-primary);opacity:.9}
`;

    function Icon({ kind, size = 14 }) {
      // Vendored Lucide icon nodes; see THIRD-PARTY-NOTICES.txt.
      const nodes = {
        book: [['path', { d: 'M12 7v14' }], ['path', { d: 'M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z' }]],
        chevron: [['path', { d: 'm6 9 6 6 6-6' }]],
        search: [['path', { d: 'm21 21-4.34-4.34' }], ['circle', { cx: 11, cy: 11, r: 8 }]],
        refresh: [['path', { d: 'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8' }], ['path', { d: 'M21 3v5h-5' }], ['path', { d: 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16' }], ['path', { d: 'M8 16H3v5' }]]
      };
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }, nodes[kind].map(([tag, attributes], key) => h(tag, { key, ...attributes })));
    }

    function Picker({ ctx, sessionId, useInput, useSession, inputActions, t }) {
      const input = useInput(value => value);
      const openState = useSession(value => value.openState);
      const [selected, setSelected] = useState([]);
      const [pending, setPending] = useState([]);
      const [opened, setOpened] = useState(false);
      const [query, setQuery] = useState('');
      const [catalog, setCatalog] = useState([]);
      const [status, setStatus] = useState('idle');
      const [error, setError] = useState('');
      const [reload, setReload] = useState(0);
      const [position, setPosition] = useState({ left: 0, top: 0, maxHeight: 400 });
      const [revealed, setRevealed] = useState(false);
      const root = useRef(null);
      const panel = useRef(null);
      const button = useRef(null);
      const search = useRef(null);
      const managedPrefix = useRef('');
      const locked = !input || openState !== 'open' || input.phase === 'adjudicating' || input.phase === 'submitting';
      const command = input?.claim !== undefined || /^\s*\/\S/u.test(input?.draft || '');

      useEffect(() => {
        if (managedPrefix.current && !input?.draft.startsWith(managedPrefix.current)) {
          managedPrefix.current = '';
          if (input?.draft === '') {
            setSelected([]);
            setPending([]);
            setOpened(false);
          }
        }
      }, [input?.draft]);

      useEffect(() => {
        if (!opened) return;
        const controller = new AbortController();
        setStatus('loading');
        setError('');
        ctx.sessions.using(sessionId, { source: 'sessionSkills', signal: controller.signal }, async reference => {
          const state = reference.binding.session.getSnapshot();
          if (state.openState !== 'open') throw state.openError || new Error(t('readOnly'));
          const result = await ctx.remote.skills.list({ sessionId }, controller.signal);
          controller.signal.throwIfAborted();
          if (!result.ok) throw new Error(result.error.message);
          return result.value.skills;
        }).then(skills => {
          if (controller.signal.aborted) return;
          setCatalog(skills);
          setPending(current => current.filter(name => skills.some(skill => skill.name === name)));
          setStatus('ready');
        }, failure => {
          if (controller.signal.aborted) return;
          setStatus('error');
          setError(failure instanceof Error ? failure.message : String(failure));
        });
        return () => controller.abort();
      }, [opened, reload, ctx, sessionId, t]);

      useLayoutEffect(() => {
        if (!opened) return;
        const canReveal = status === 'ready' || status === 'error';
        const place = () => {
          const anchor = button.current?.getBoundingClientRect();
          if (!anchor) return;
          const width = Math.min(360, window.innerWidth - 24);
          const above = anchor.top - 16;
          const below = window.innerHeight - anchor.bottom - 16;
          const preferAbove = above >= 400 || above >= below;
          const maxHeight = Math.max(80, Math.min(400, preferAbove ? above : below));
          const height = Math.min(panel.current?.getBoundingClientRect().height || maxHeight, maxHeight);
          const top = preferAbove ? Math.max(8, anchor.top - height - 7) : anchor.bottom + 7;
          setPosition({ left: Math.max(12, Math.min(anchor.left, window.innerWidth - width - 12)), top, maxHeight });
        };
        place();
        const observer = new ResizeObserver(place);
        if (panel.current) observer.observe(panel.current);
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);
        if (canReveal && !revealed) {
          setRevealed(true);
          search.current?.focus();
        }
        return () => {
          observer.disconnect();
          window.removeEventListener('resize', place);
          window.removeEventListener('scroll', place, true);
        };
      }, [opened, status]);

      useEffect(() => {
        if (!opened) return;
        const clickAway = event => {
          if (!root.current?.contains(event.target) && !panel.current?.contains(event.target)) setOpened(false);
        };
        document.addEventListener('pointerdown', clickAway, true);
        return () => document.removeEventListener('pointerdown', clickAway, true);
      }, [opened]);

      function close(restoreFocus = true) {
        setOpened(false);
        if (restoreFocus) button.current?.focus();
      }
      function apply() {
        if (locked || command || status !== 'ready') return;
        const names = pending.filter(name => catalog.some(skill => skill.name === name));
        const result = withSkills(input, managedPrefix.current, names);
        inputActions.setDraft(result.draft);
        managedPrefix.current = result.prefix;
        setSelected(names);
        close();
      }
      const filtered = catalog.filter(skill => `${skill.name} ${skill.description}`.toLowerCase().includes(query.trim().toLowerCase()));
      const tooltip = locked ? t('locked') : selected.length ? t('chosen', { names: selected.join(', ') }) : t('title');

      return h('div', { className: 'dss-root', ref: root, 'data-session-skills': sessionId },
        h('style', null, css),
        h('button', {
          ref: button, type: 'button', className: 'dss-button', disabled: locked,
          title: tooltip, 'aria-label': t('button'), 'aria-haspopup': 'dialog', 'aria-expanded': opened,
          'data-selected': selected.length > 0,
          onClick: () => {
            if (opened) return close();
            setRevealed(false);
            setStatus('loading');
            setError('');
            setPending([...selected]); setQuery(''); setOpened(true);
          }
        }, h(Icon, { kind: 'book' }), t('button'), selected.length ? h('span', { className: 'dss-count' }, selected.length) : null, h(Icon, { kind: 'chevron', size: 11 })),
        opened ? createPortal(h('section', {
          ref: panel, className: 'dss-panel', role: 'dialog', 'aria-label': t('title'), style: { ...position, visibility: revealed ? 'visible' : 'hidden' },
          onKeyDown: event => {
            if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
            if (event.key === 'Tab') {
              const nodes = [...panel.current.querySelectorAll('button:not(:disabled),input:not(:disabled)')];
              const at = nodes.indexOf(document.activeElement);
              if (event.shiftKey && at === 0) { event.preventDefault(); nodes.at(-1)?.focus(); }
              else if (!event.shiftKey && at === nodes.length - 1) { event.preventDefault(); nodes[0]?.focus(); }
            }
          }
        },
          h('div', { className: 'dss-head' }, h('span', null, t('title')), h('button', { type: 'button', className: 'dss-icon', title: t('refresh'), 'aria-label': t('refresh'), onClick: () => setReload(value => value + 1) }, h(Icon, { kind: 'refresh' }))),
          h('label', { className: 'dss-search' }, h(Icon, { kind: 'search' }), h('input', { ref: search, value: query, placeholder: t('search'), 'aria-label': t('search'), onChange: event => setQuery(event.target.value) })),
          h('div', { className: 'dss-list', 'aria-busy': status === 'loading' },
            status === 'loading' ? h('div', { className: 'dss-state', role: 'status' }, t('loading')) :
              status === 'error' ? h('div', { className: 'dss-state' }, t('failed'), ' ', h('button', { type: 'button', className: 'dss-command', onClick: () => setReload(value => value + 1) }, t('retry'))) :
                filtered.length === 0 ? h('div', { className: 'dss-state' }, t(catalog.length ? 'empty' : 'noCatalog')) :
                  filtered.map(skill => h('label', { key: skill.name, className: 'dss-row' },
                    h('input', { type: 'checkbox', checked: pending.includes(skill.name), onChange: () => setPending(current => current.includes(skill.name) ? current.filter(name => name !== skill.name) : [...current, skill.name]) }),
                    h('span', { className: 'dss-copy' }, h('span', { className: 'dss-name' }, skill.name), h('span', { className: 'dss-desc', title: skill.description }, skill.description))
                  ))
          ),
          error ? h('div', { className: 'dss-error', role: 'alert' }, error) : null,
          command ? h('div', { className: 'dss-error', role: 'alert' }, t('command')) : null,
          h('div', { className: 'dss-foot' },
            h('span', { className: 'dss-total', 'aria-live': 'polite' }, t('selected', { count: pending.length })),
            h('button', { type: 'button', className: 'dss-command', disabled: pending.length === 0, onClick: () => setPending([]) }, t('clear')),
            h('button', { type: 'button', className: 'dss-command', onClick: () => close() }, t('cancel')),
            h('button', { type: 'button', className: 'dss-command dss-primary', disabled: locked || command || status !== 'ready', onClick: apply }, t('apply'))
          )
        ), document.body) : null
      );
    }

    function SessionPicker(props) {
      return h(Picker, { ...props, key: props.sessionId });
    }

    return {
      inject: ['slots', 'locale', 'sessions', 'remote', 'remote.skills'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'session-skills: locale');
        ctx.slots.inject('conversation.input.left', () => ctx.slots.register({
          name: 'conversation.input.left', id: 'local-session-skills', order: 30, locale: NS,
          inject: () => ({ ctx })
        }, SessionPicker));
      },
      _test: { withSkills, semanticDraft }
    };
  }
});
