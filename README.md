# DeepSeek Harness 会话技能选择器

在输入框工具栏的“专家”控件右侧加入“技能”按钮，使用 Harness 的官方 `conversation.input.left` 插槽。

## 功能

- 点击“技能”，搜索当前会话可调用的技能并用复选框多选。
- 点击“确定”，把所选技能插入当前草稿，呈现为 Harness 原生技能引用。
- 保留草稿文字、文件引用和附件；已手动输入的同名技能不会重复添加。
- 同一份未发送草稿中重新选择或清空，会替换本插件加入且仍完整的技能前缀。
- 选择状态只在当前组件内存中保存。新建会话、离开后重新进入会话、刷新或重启应用后，按钮重新从零开始。
- 技能目录每次打开选择面板都会重新读取，支持刷新、搜索、加载失败重试、Escape 关闭和键盘操作。
- 不会更改全局技能启停状态，不会修改 Harness 安装包。

## 技能如何生效

选中并确认后，草稿中会出现 `Skills: /skill-one /skill-two`。发送消息时，Harness 原生 `tool-skill` 插件把这些技能的完整指令载入该会话；未发送的草稿不会调用模型。`Skills:` 前缀保证首次发送直接作为普通消息提交，避免开头的 `/` 被宿主命令选择器截获。

按钮的数量表示当前草稿确认过的选择。发送或清空草稿后，按钮数量清零；已发送的技能指令进入正常会话历史，因此同一会话的后续消息可继续使用，无需每条消息重复加载。取消勾选不会删除已经发送的历史指令；需要完全隔离时应开启新会话。重新进入旧会话不会恢复按钮选择，但旧会话历史仍由 Harness 保留。

此插件是显式选择入口，不会限制 Harness 自身根据任务自动调用其他已启用技能。技能列表来自当前会话的官方目录，包括其可见的用户技能、项目技能和已注册的插件技能。

## 安装

先下载并解压源码，或克隆本仓库，将插件放到准备长期保留的目录。完全退出 DeepSeek Harness，包括系统托盘进程，然后在包含 `Install.ps1` 的目录打开 PowerShell，运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Install.ps1
```

安装器预设安装目录为 `D:\Ysoft\DeepseekHarness`，默认配置为 `desktop`。它调用 Harness 自带的官方插件 CLI，采用离线本地目录安装，不执行依赖包的生命周期脚本。检测到 Harness 仍在运行时会停止并提示退出，不会主动结束进程。目录安装会链接当前源代码目录，因此安装后请保留本目录。再次启动 Harness 后，“技能”位于输入框下方左侧工具栏。

安装路径不同时需要指定实际目录：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Install.ps1 -HarnessDirectory 'D:\Apps\DeepseekHarness'
```

也可在 Harness 插件管理界面选择本地目录安装，目录为包含本文件和 `package.json` 的文件夹。

安装器不会自动修复已有插件的依赖冲突。官方 CLI 若报告其他依赖的版本或离线缓存问题，应先在 Harness 中处理该依赖，再重试安装。

## 卸载

退出 Harness 后使用其官方 CLI：

```powershell
& 'D:\Ysoft\DeepseekHarness\resources\runtime\cli\bin\dsh.cmd' plugin --profile desktop remove '@local/dsh-session-skills' --offline --ignore-scripts
```

## 验证记录

已在 Windows 上的 Harness `0.2.1-rc.5` 中，使用独立测试配置完成离线安装和浏览器验证：搜索、多选、确定、取消、清空、新会话重置，以及桌面和窄屏布局。通过本地测试模型确认，发送后能够收到所选技能的完整指令；测试未调用外部模型。

另有 6 项自动化检查覆盖草稿保留、文件引用位置、重复技能、前缀更新和插件注册，全部通过。其他 Harness 版本尚未验证。

## 开发验证

需要 Node.js 22 或更新版本。在源码目录中运行：

```powershell
node --check client.js
node --check index.js
node --test tests/*.test.cjs
```

插件无第三方运行依赖，无构建步骤。React、技能目录、会话和多语言服务均由宿主提供。

使用原生技能引用而非直接改写模型请求，使模型收到的技能内容沿用 Harness 的日志、恢复和回放流程。
