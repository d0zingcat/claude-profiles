# clp 演示录像

终端演示（asciinema），展示常用流程，无需阅读完整文档。

## 在线观看

https://asciinema.org/a/vO1bi0JTeGspfhD8

```markdown
[![asciicast](https://asciinema.org/a/vO1bi0JTeGspfhD8.svg)](https://asciinema.org/a/vO1bi0JTeGspfhD8)
```

## 本地回放

```bash
asciinema play demo/clp-demo.cast
```

## 重新录制

```bash
bash demo/record.sh
```

演示使用隔离的临时 `HOME`，不会改动你真实的 `~/.claude` 配置。

## 演示内容

1. 安装命令提示
2. `clp list` / `clp current`
3. `clp add` 交互式添加 profile
4. `clp use` 永久切换
5. `clp run` 交互式选择 profile 并临时启动 Claude Code
6. `clp undo` 一键还原

## 依赖

- [asciinema](https://asciinema.org/)
- [expect](https://core.tcl-lang.org/expect/)（驱动交互式提示）
