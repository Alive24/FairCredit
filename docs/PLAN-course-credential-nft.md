# Plan: Course ↔ Credential 关联与 NFT 兼容

## 更新：Course / Credential 不再传 id，PDA 即唯一标识

- **Course**：创建时不传 `course_id`。PDA seeds = `[b"course", hub, provider, creation_timestamp]`（客户端传当前时间戳，合约校验在 ±5 分钟内防重放）。Course 状态去掉 `id`，新增 `creation_timestamp: i64`。
- **Credential**：创建时不传 `credential_id` / `course_id`。PDA seeds = `[b"credential", course_pda, student_wallet]`，保证每个学生在每门课下最多一个 credential。
- **Hub**：`accepted_courses` 改为 `Vec<Pubkey>`（存 course PDA）；`add_accepted_course(creation_timestamp, provider_wallet)`、`remove_accepted_course(creation_timestamp, provider_wallet)`。
- **CourseStudent / Weight / Resource**：与 course 的关联改为 `course: Pubkey`（course PDA），不再用 `course_id: String`。

## 1. 目标

- **Course** 持有 **approved_credentials**：由 Provider 确认后的 credential 列表。
- **Credential** 明确关联到 **Course**（学生基于某门课创建 credential）。
- **流程**：学生基于 Course 创建 Credential → Endorser 签名 → Provider 确认后将 Credential 加入 Course 的 `approved_credentials`。
- **Credential 兼容通用 NFT 标准**：便于钱包、市场、第三方展示与验证。

---

## 2. 合约改动（Anchor / Rust）

### 2.1 Course 状态 (`state/course.rs`)

- 在 `Course` 中新增字段：
  - `approved_credentials: Vec<Pubkey>`（或 `Vec<u64>` 若 credential 用 id 标识）
  - 建议用 **Credential PDA 地址**（`Pubkey`），便于链上直接读取 credential 账户。
- 使用 `InitSpace` 时需定长上界，例如：`#[max_len(200)] pub approved_credentials: Vec<Pubkey>`（按需调整 200）。
- 在 `Course` 上实现方法，例如：
  - `add_approved_credential(&mut self, credential_pubkey: Pubkey) -> Result<()>`
  - 校验未重复、未超上限，然后 `push` 并更新 `updated`。

### 2.2 Credential 状态 (`state/credential.rs`)

- 在 `Credential` 中新增：
  - **`course_id: String`**（或 `course_pubkey: Pubkey`）
  - 若用 course 的 PDA 更一致，可用 `course: Pubkey`；若沿用现有 course 的 `id: String`，则用 `course_id: String` 与现有 Course 表意一致。
- 这样每条 credential 明确归属于某一门 Course，便于查询「某门课下所有 credential」以及后续 NFT 元数据里带 course 信息。

### 2.3 指令与权限

- **CreateCredential**

  - 增加 `course` 账户（或 course_id 入参），并在 instruction 里写入 `credential.course_id` / `credential.course`。
  - 校验 `course` 属于当前 provider、且状态允许创建 credential（例如 Published）。

- **ApproveCredential（新指令）**

  - 仅 **Provider** 可调用。
  - 账户：`credential`、`course`、`provider`、`provider_authority`（signer）。
  - 逻辑：
    - 校验 credential 的 provider 与 signer 一致；
    - 校验 credential 的 course 与传入的 `course` 一致；
    - 校验 credential 已 Endorsed（或已达可「批准」的状态）；
    - 调用 `course.add_approved_credential(credential.key())`；
    - 可选：将 credential 状态更新为 `Verified` 或保持 `Endorsed` 由产品决定。

- **EndorseCredential**
  - 保持不变，仅 Endorser 签名；不在此处改 course。

### 2.4 兼容通用 NFT 标准（Credential 侧）

- **现状**：`Credential` 已有 `nft_mint: Pubkey`，表示关联的 NFT mint。
- **建议**：
  - **链上**：保持 `nft_mint`，不强制在 Fair Credit 程序内实现完整 NFT 逻辑；由前端/外部服务在 **铸造 NFT 时** 使用通用标准。
  - **标准选择**：
    - **Metaplex Token Metadata**：Solana 上最常用，钱包与市场支持好；或
    - **Metaplex Digital Asset Standard (DAS)**：新版 API 更统一。
  - **实现方式**：
    - **方案 A**：Fair Credit 只存 `nft_mint`；铸造与写入 Metadata 由前端/独立服务调用 Metaplex 等程序完成；Credential 创建时传入已创建或即将关联的 mint。
    - **方案 B**：在 Fair Credit 内增加一条「MintCredentialNft」类指令，内部调用 Metaplex 的 create metadata + mint，保证 metadata 中写入 `course_id`、`credential_id`、`provider` 等，便于链上链下一致。
  - **Metadata 内容建议**：
    - `name`、`description`、`image`（或 URI）
    - 自定义属性：`course_id`、`credential_id`、`provider`、`student`、`completion_date` 等，便于第三方与 Fair Credit 合约对账。

### 2.5 数据迁移与兼容

- 已有 **Course** 账户：新增 `approved_credentials` 后，旧账户需 **realloc** 或通过「升级」指令扩展 space，否则旧账户没有该字段。
  - 若使用 `InitSpace` 的固定最大长度，新部署的 program 会为新 Course 分配更大 space；旧 Course 需要一次迁移（新指令：扩展 account space 并写入空 vec）。
- 已有 **Credential** 账户：新增 `course_id`/`course` 后同理，旧 Credential 需迁移或标记为「无 course」的兼容逻辑。

---

## 3. 前端 / 产品

- **创建 Credential**：必须选择一门 Course（已接受、已发布）；提交时传 `course` / `course_id`。
- **课程详情 / 管理页**：展示该 Course 的 `approved_credentials` 列表（只读或带「撤销」根据产品需求）。
- **Provider 工作流**：学生创建 → Endorser 签名 → Provider 在后台点击「批准」→ 调用 `ApproveCredential`，将该 credential 加入对应 Course 的 `approved_credentials`。
- **NFT 展示**：钱包/市场通过 `nft_mint` 拉取 Metaplex Metadata，用自定义属性展示「课程」「颁发方」等。

---

## 4. 实施顺序建议

1. **合约** ✅ 已完成

   - Course 增加 `approved_credentials`；实现 `add_approved_credential`。 ✅
   - Credential 增加 `course_id`（String, max_len 32）。 ✅
   - CreateCredential 增加 `course` 账户与 `course_id` 入参并写入；校验 `course.provider == provider_authority` 且 `course.status == Verified`。 ✅
   - 新增 ApproveCredential 指令（Provider 将已 Endorsed 的 credential 加入 course.approved_credentials，credential 状态设为 Verified）。 ✅
   - （可选）MintCredentialNft 或文档约定 Metaplex 铸造与 metadata 格式。

2. **IDL / 代码生成** ✅

   - 在 `anchor/` 下执行 `anchor build` 生成 IDL（`anchor/target/idl/fair_credit.json`）。
   - 将 IDL 复制到仓库根目录供 Codama 使用：`mkdir -p target/idl && cp anchor/target/idl/fair_credit.json target/idl/`（或使用 `scripts/deploy` 的 update-idl 步骤）。
   - 在仓库根目录执行 `npm run gen:client`（Codama）重新生成 `app/lib/solana/generated/` 下的类型与指令。
   - 完成后 `createCredential` 将包含 `course` 账户与 `courseId` 参数，并会生成 `approveCredential` 指令；`Credential` 含 `course` 字段，`Course` 含 `approvedCredentials`。

3. **前端**

   - Create Credential 页选择 Course；
   - Provider 端「批准」按钮调用 ApproveCredential；
   - 课程详情展示 approved_credentials。

4. **迁移**
   - 若有旧 Course/Credential 账户，再安排 realloc 与迁移脚本。

---

## 5. 小结

- **Course**：新增 `approved_credentials: Vec<Pubkey>`，Provider 通过新指令将已 Endorsed 的 credential 加入列表。
- **Credential**：新增 `course_id`/`course`，创建时绑定 Course。
- **NFT**：继续使用 `nft_mint`，铸造与 metadata 采用 Metaplex（或 DAS）标准，在 metadata 中体现 course 与 credential 信息，实现「兼容常见通用 NFT 标准」。
