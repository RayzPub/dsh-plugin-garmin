# Garmin Watch Face Generator — RSI (Recursive Self-Improvement) 架构规范

> 本文档规范了 `dsh-plugin-garmin` 的递归自演进 (RSI) 闭环机制、评测用例基准、白盒打分矩阵及持续迭代流程。

---

## 🎯 一、 核心目标与使命

传统 Agent 插件依赖人工被动发现 Bug 并手动修改代码。RSI 框架通过建立**「用例基准 (Eval Cases) ➔ 自动化跑测 (Runner) ➔ 白盒静态分析打分 (Analyzer) ➔ 瓶颈诊断与优化 Prompt 生成 (Diagnostician) ➔ 代码修复与回归 (Refiner/Agent) ➔ 演进对比 (Metrics Diff)」**的自动化飞轮，实现：
1. **每一个步骤（Specs ➔ Preview ➔ Scaffold ➔ Gate ➔ Build）首次确定性成功率达到 95%+**；
2. **彻底杜绝脚手架代码与矢量预览脱节的问题**（所见即所得）；
3. **严格锁死 Garmin Fenix 7 的硬件强约束**（零分配、64 色 MIP、Manifest XSD 合规）。

---

## 🏗️ 二、 框架目录结构

```
rsi/
├── cases/
│   └── archetypes.json      # 5 类核心形态基准测试用例库（战术、运动、飞行员、极简、混合）
├── runner.mjs               # 测试运行器：执行表盘生成并捕获产物与运行轨迹
├── analyzer.mjs             # 产物白盒分析器：对 SVG、Monkey C、Manifest 进行多维度打分
├── diagnostician.mjs        # 瓶颈诊断器：汇总缺陷，计算各环节失分，生成行动指南
├── loop.mjs                 # RSI 闭环总控 CLI（支持跑测、对比、诊断）
└── history/                 # 历史跑测评分快照（用于 Delta 对比与回归检测）
```

---

## 📐 三、 评分矩阵与扣分规则（满分 100 分）

每个测试用例按以下 4 个维度进行综合打分：

### 1. 工具链与产物完整性（25 分）
- [x] **Preview SVG 生成有效性**（10 分）：必须存在、大小在合理区间（1KB~64KB）、XML 格式合法。
- [x] **Scaffold 工程完整性**（15 分）：必须生成 `manifest.xml`、`monkey.jungle`、`resources/drawables/launcher_icon.png` (30×30)、`resources/strings/strings.xml`、`source/App.mc` 与 `source/View.mc`。

### 2. 硬件与架构合规性（35 分）
- [x] **零分配热路径（Zero-Allocation in `onUpdate`）**（15 分）：
  - 严禁在 `onUpdate()` 中声明数组字面量（如 `var hours = [...]`，扣 10 分）；
  - 严禁在 `onUpdate()` 中出现 `new` 操作符（扣 5 分）；
  - 严禁使用 `Lang.format` 传递临时数组重载（扣 5 分）。
- [x] **MIP 64 色硬件合规**（10 分）：
  - 所有颜色必须为合法 64 色；
  - 优先使用 `Toybox.Graphics.COLOR_*` 命名常量。
- [x] **Manifest XSD 与权限最小化**（10 分）：
  - 必须包含 `<iq:languages><iq:language>eng</iq:language></iq:languages>`（扣 5 分）；
  - 遵循最小权限原则：无传感器历史图表时严禁声明 `SensorHistory`（扣 5 分）；如有气压海拔等需求需有合规声明。

### 3. 视觉保真度与预览对齐（Visual Fidelity，25 分）
- [x] **弧形进度环保真度**（10 分）：若微件包含 `style: 'arc_progress'`（如心率环、步数环），`View.mc` 必须具备真实的几何弧绘制逻辑（`drawArcRing` / `Math.sin` / `Math.cos`），严禁降级为纯文本（扣 10 分）。
- [x] **进度条与视窗保真度**（10 分）：若包含 `style: 'bar_progress'` 或 `style: 'badge'`，必须具备矩形绘制逻辑（`fillRectangle`），低电量具备红光预警（扣 10 分）。
- [x] **指针与刻度对齐**（5 分）：模拟指针及表盘刻度必须与 Spec 的配置一致。

### 4. 传感器与空安全防御（15 分）
- [x] **空值与无效采样防护**（10 分）：查询 `ActivityMonitor.getInfo()` 时必须校验 `null` 与 `INVALID_HR_SAMPLE`。
- [x] **休眠模式功耗控制**（5 分）：模拟表盘必须根据 `_isSleep` 在休眠时自动隐藏高刷秒针。

---

## 🚦 四、 命令行操作指南

### 1. 运行一次完整的 RSI 评估
```bash
node rsi/loop.mjs --eval
```
该命令会自动跑完全量基准测试用例，并在控制台输出评分看板，同时将快照保存至 `rsi/history/run-<timestamp>.json`。

### 2. 打印当前瓶颈诊断
```bash
node rsi/loop.mjs --diagnose
```
输出当前最严重的扣分项排行榜，并给出具体的代码修改建议。

### 3. 演进对比（衡量当前优化效果）
```bash
node rsi/loop.mjs --compare rsi/history/run-<previous-run>.json
```
自动比对本次运行与上一次运行的各项指标得分，输出彩色 ASCII 提升对比表（Delta Table）。

### 4. 机器可读 JSON 输出（供外部 Agent 自动化消费）
```bash
node rsi/loop.mjs --json
```
以标准 JSON 结构直接向 stdout 输出全量评分、子项细则（breakdown）、违规列表（violations）以及精准诊断指南（diagnosis.actionItems）。

---

## 🤖 五、 外部 Agent 自动化协议与机器可读规范 (Agent Protocol)

为支持外部自主 Agent（如 Antigravity, Claude Code, Cursor, CI Bot）无需人类介入闭环驱动自演进，制定本契约：

### 1. 结构化输出 Schema
`node rsi/loop.mjs --json` 输出核心字段如下：
```json
{
  "timestamp": "2026-09-04T07:46:02.960Z",
  "durationMs": 82,
  "totalCases": 5,
  "passedCases": 5,
  "averageScore": 99.8,
  "passRate": "100%",
  "latestPath": "/path/to/rsi/history/latest.json",
  "cases": [
    {
      "id": "tactical_stealth",
      "score": 99,
      "passed": true,
      "breakdown": {
        "completeness": 25,
        "hardware": 35,
        "fidelity": 24,
        "safety": 15
      },
      "violations": [],
      "successes": ["..."]
    }
  ],
  "diagnosis": {
    "topBottlenecks": [
      { "issue": "...", "occurrences": 1, "impact": "20% 用例受影响" }
    ],
    "actionItems": [
      {
        "area": "src/preview/code-generator.ts",
        "title": "...",
        "fix": "..."
      }
    ]
  }
}
```

### 2. 外部 Agent 的标准决策循环（Decision Loop）
1. **获取基线**：执行 `node rsi/loop.mjs --json` 并保存为 `baseline.json`；
2. **提取瓶颈**：读取 `diagnosis.actionItems`，找到 `area`（目标源码文件）与 `fix`（修复建议）；
3. **精准编码**：修改对应 `src/` 文件，保持现有架构规范与注释完整性；
4. **硬性单元验证**：执行 `npm test`，确保原有 26 项单元测试 100% 通过（防止代码回归）；
5. **衡量演进成果**：执行 `node rsi/loop.mjs --compare baseline.json`；
6. **准入准出决策**：
   - ✅ **提交 (Commit)**：`averageScore` 提升，且 `npm test` 全绿；
   - ❌ **回滚 (Rollback)**：若分数未提升或测试报错，执行 `git reset --hard` 并基于下一条 Action Item 重新探索。

### 3. 评测完整性与防作弊红线 (Anti-Gaming Invariants)
- ❌ **严禁篡改基准用例**：`rsi/cases/archetypes.json` 是不可变的系统标尺，禁止为了提高分数删除或修改用例中的微件与断言要求。
- ❌ **严禁弱化评分门禁**：禁止修改 `rsi/analyzer.mjs` 中的满分上限或删减违规检测逻辑。
- ❌ **严禁破坏硬件红线**：零分配（Zero Allocation in `onUpdate`）与 64 色 MIP 调色板为不可违背的物理铁律。
