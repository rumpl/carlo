import { disposeModel } from '../editor/models';
import { useEditorStore } from '../store/useEditorStore';
import { Tab } from './Tab';

export function TabBar() {
  const { tabs, activeTabId, setActive, closeTab } = useEditorStore();
  return <div className="tab-bar">
    {tabs.map((tab) => <Tab key={tab.id} tab={tab} active={tab.id === activeTabId} onSelect={() => setActive(tab.id)} onClose={() => {
      if (tab.dirty && !confirm(`Discard unsaved changes to ${tab.title}?`)) return;
      const closed = closeTab(tab.id);
      if (closed) disposeModel(closed.uri);
    }} />)}
  </div>;
}
