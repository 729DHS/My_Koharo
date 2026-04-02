import { bgmConfig } from '@constants/site-config';
import { useStore } from '@nanostores/react';
import { $bgmActiveTab, $bgmPanelOpen, openBgmPanel, setBgmActiveTab } from '@store/bgm';

export default function BgmPlaylistConsole() {
  const activeTab = useStore($bgmActiveTab);
  const panelOpen = useStore($bgmPanelOpen);

  if (!bgmConfig.enabled || bgmConfig.audio.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-5 text-muted-foreground">当前未配置背景音乐歌单。</div>
    );
  }

  return (
    <section className="space-y-4">
      <p className="text-muted-foreground text-sm">这里是背景音乐控制台。点击歌单会直接控制右下角背景音乐播放器。</p>

      <div className="grid gap-3">
        {bgmConfig.audio.map((group, index) => {
          const isActive = activeTab === index;
          return (
            <button
              type="button"
              key={`${group.title || 'playlist'}-${index}`}
              onClick={() => {
                setBgmActiveTab(index);
                openBgmPanel();
              }}
              className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                isActive
                  ? 'border-primary/70 bg-primary/10 text-foreground'
                  : 'border-border/60 bg-card hover:border-primary/40 hover:bg-accent/40'
              }`}
            >
              <div className="font-semibold">{group.title || `歌单 ${index + 1}`}</div>
              <div className="mt-1 text-muted-foreground text-xs">{group.list.length} 条来源</div>
            </button>
          );
        })}
      </div>

      <p className="text-muted-foreground text-xs">
        {panelOpen ? '背景音乐面板已打开，可直接播放。' : '点击上方歌单会自动打开右下角背景音乐面板。'}
      </p>
    </section>
  );
}
