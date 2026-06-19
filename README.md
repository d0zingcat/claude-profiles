# claude-profiles

轻量 CLI 工具，用于在多个 Claude API 端点配置之间管理和切换。类似 [cc-switch](https://github.com/farion1231/cc-switch)，但只聚焦 Claude Code 的端点切换。

## 安装

```bash
pnpm install -g .
# 或发布后
pnpm install -g claude-profiles
```

安装后可使用 `claude-profiles` 或缩写 `clp`。

## 快速开始

```bash
# 从当前 ~/.claude/settings.json 导入为 profile
claude-profiles add work --from-current

# 交互式添加
claude-profiles add

# 交互式切换
claude-profiles use

# 命令行添加（跳过交互）
claude-profiles add proxy \
  --url https://api.example.com \
  --token sk-xxx \
  --apply

# 命令行切换
claude-profiles use proxy

# 一键还原到切换前
claude-profiles restore

# 查看备份列表
claude-profiles backups

# 查看当前配置
claude-profiles current

# 从 cc-switch 导入 Claude provider
claude-profiles import cc-switch

# 非交互导入全部，并切换到 cc-switch 当前 provider
claude-profiles import cc-switch --all --apply-current

# 交互式编辑
claude-profiles edit work

# 删除 profile
claude-profiles remove proxy
```

## 工作原理

- Profile 保存在 `~/.claude-profiles/profiles.json`
- 切换时更新 `~/.claude/settings.json` 中的 `env` 字段（`ANTHROPIC_BASE_URL`、`ANTHROPIC_AUTH_TOKEN` 等）
- **切换前**会将完整的 `settings.json` 备份到 `~/.claude-profiles/backups/`，可用 `restore` 一键还原
- 其他 settings 字段（如 `permissions`、`model`）在切换时从备份中完整保留

## 命令

| 命令 | 说明 |
|------|------|
| `list` / `ls` | 列出所有 profile |
| `add [name]` | 交互式添加 profile（提供完整参数时为命令行模式） |
| `use [name]` / `switch` | 交互式切换 profile（提供名称时直接切换） |
| `restore [id]` / `undo` | 一键还原到切换前的配置 |
| `backups` / `backup` | 列出切换备份 |
| `current` | 显示当前生效配置 |
| `import cc-switch` | 从 cc-switch 数据库导入 Claude provider |
| `edit [name]` | 交互式编辑 profile |
| `remove <name>` / `rm` | 删除 profile |

### add 选项

| 选项 | 说明 |
|------|------|
| `--url <url>` | API 端点 |
| `--token <token>` | ANTHROPIC_AUTH_TOKEN |
| `--api-key <key>` | ANTHROPIC_API_KEY |
| `--from-current` | 从当前 Claude 配置导入 |
| `--apply` | 保存后立即切换 |

### import cc-switch 选项

| 选项 | 说明 |
|------|------|
| `--db <path>` | cc-switch 数据库路径（默认 `~/.cc-switch/cc-switch.db`） |
| `--all` | 导入全部可导入的 provider |
| `--overwrite` | 覆盖同名 profile |
| `--apply-current` | 导入后切换到 cc-switch 当前 provider |

> 官方 OAuth 登录类 provider（无 `ANTHROPIC_BASE_URL`）会自动跳过。

## 开发

```bash
pnpm install
pnpm build
node dist/cli.js list
```
