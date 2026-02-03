## FairCredit 内容存储架构：IndexedDB → Nostr → Walrus + Metaplex

本说明文档概述 FairCredit 在内容存储上的混合方案：前端轻存储 + 去中心化可更新事件 + 永久归档，只在链上存最小指针。

### 1. 草稿阶段：浏览器 IndexedDB

- **存储位置**：浏览器 IndexedDB（数据库名 `faircredit-drafts`，对象仓库 `resourceDrafts`）。
- **数据模型**：按 `resourcePubkey` 作为 key 存储：
  - `content: string`
  - `updatedAt: number`（毫秒时间戳）
- **实现文件**：
  - `app/lib/drafts/resourceDraftStore.ts`
  - `app/hooks/use-resource-draft.ts`
- **特性**：
  - 秒开、离线可编辑。
  - 页面刷新后，草稿会自动从 IndexedDB 恢复。
  - 通过定时自动保存，避免每个按键都写磁盘。

### 2. 同步/分享阶段：Nostr 可更新事件

- **定位方式**：
  - 使用 Nostr 事件的 `d` tag（`["d", nostr_d_tag]`）和作者公钥 `nostr_author_pubkey` 作为联合索引。
  - `nostr_d_tag` 建议格式：`<resourcePubkey>:<createdTimestamp>`。
- **链上指针**（存储在 `Resource` 账户）：
  - `nostr_d_tag: Option<String>`（`#[max_len(96)]`）
  - `nostr_author_pubkey: [u8; 32]`
- **相关 Anchor 指令**：
  - `set_resource_nostr_ref(...)`：写入/更新 Nostr 指针。
    - 仅 `resource.created_by`（资源创建者）有权限。
    - 默认只允许设置一次，如需重绑需传 `force = true`。
- **前端封装**：
  - `app/lib/nostr/client.ts`
    - `publishResourceEvent({ dTag, content })`：向一组 relay 发布资源内容事件。
    - `fetchLatestResourceEvent({ dTag, authorPubkey })`：按 dTag + 作者拉取最新事件。
    - `syncAllResourceEventsForAuthor({ authorPubkey })`：多设备登录时同步该作者的所有本应用事件。
    - `buildResourceDTag({ resourcePubkey, created })`：统一生成 dTag。

### 3. 定稿阶段：Walrus 归档 + Metaplex Metadata

- **归档流程概念**：
  1. 前端在“生成 Credential NFT”之前收集最终内容（来自 IndexedDB 草稿或 Nostr 最新事件）。
  2. 将内容打包为一个 bundle（包括 resourcePubkey、credentialPubkey、文本内容等）。
  3. 调用 Walrus 上传接口，获得 `blobId`。
  4. 使用 `blobId` 构造 Metaplex metadata URI（例如 `https://walrus.gateway/<blobId>` 或后续自定义网关），用于 NFT metadata。
  5. 调用 Anchor 指令 `set_resource_walrus_ref(...)`，将 `blobId` 写入对应 `Resource` 账户的 `walrus_blob_id` 字段。
- **链上字段**（同样在 `Resource` 账户）：
  - `walrus_blob_id: Option<String>`（`#[max_len(128)]`）
- **前端封装**：
  - `app/lib/walrus/upload.ts`
    - `uploadToWalrus(bundle): Promise<{ blobId }>`：当前为 mock 实现，后续可接入真实 Walrus API。

### 4. 链上只存指针，内容留在链下

- Anchor `Resource` 账户不再作为长文本存储：
  - `content: Option<String>` 字段只为兼容旧数据，新流程不再写入。
- 新增的三个指针字段：
  - `nostr_d_tag`：指向可更新的 Nostr 事件流。
  - `nostr_author_pubkey`：保证只从指定作者的事件流中读取。
  - `walrus_blob_id`：指向 Walrus 上的最终归档（通常再通过 HTTP 网关或自定义协议暴露给 Metaplex metadata URI）。
- 好处：
  - 链上租金最小化，只存短指针。
  - 草稿和编辑体验完全在本地/Relay 上完成。
  - 定稿后可获得稳定的、版本化的归档引用，方便 NFT 永久指向。

### 5. 多设备与可用性策略（概要）

- 设备切换：
  - 根据链上保存的 `nostr_d_tag` + `nostr_author_pubkey`，通过 `syncAllResourceEventsForAuthor` 从多条 relay 拉取历史事件。
  - 将结果回灌到 IndexedDB，使新设备也能看到已有资源内容。
- 可用性增强：
  - 如果本地 IndexedDB 中有草稿，而在部分 relay 上查不到对应 dTag 事件，可以通过 `publishResourceEvent` 再次向更多 relay 发送，提升可用性。
  - relay 健康度与重试策略可以在前端进一步扩展（例如简单的错误计数与优先级排序）。

