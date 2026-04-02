import { SearchEngine } from "@/components/search/SearchEngine";

export default function HomePage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold tracking-tight">热点探索</h1>
      <p className="text-muted-foreground text-sm">
        搜索联网信息并由 Gemini 整理为结构化卡片，点击卡片开始写作向导。
      </p>
      <SearchEngine />
    </div>
  );
}
