/**
 * unit_tests.js - 校园失物招领单元测试用例集
 * 包含 17 个白盒测试与边界值测试用例，覆盖表单校验、多维检索、安全防护与数据流转
 */

const UnitTests = [
  {
    name: '测试用例 1: 正常寻物启事数据格式完整校验通过',
    category: '输入校验 (validateItem)',
    description: '验证当提供合规的寻物信息（标题、分类、地点、有效日期、微信联系方式）时，校验器返回 isValid=true 且错误列表为空。',
    testFn(assert) {
      const validItem = {
        type: 'lost',
        title: '黑色雨伞',
        category: '生活钥匙',
        location: '西三教学楼201教室',
        date: '2026-10-02',
        contactType: '微信',
        contactVal: 'fzu_student_test'
      };
      const result = Utils.validateItem(validItem);
      assert.isTrue(result.isValid, '正常数据应该通过校验');
      assert.strictEqual(result.errors.length, 0, '错误列表应为空');
    }
  },

  {
    name: '测试用例 2: 物品名称为空或仅含空白符边界拦截',
    category: '边界值测试 (validateItem)',
    description: '针对测试人员输入空字符串或全空格标题的刁难测试，应被正确拦截。',
    testFn(assert) {
      const emptyTitleItem = {
        type: 'lost',
        title: '    ',
        category: '数码电子',
        location: '图书馆西区',
        date: '2026-10-02',
        contactType: '微信',
        contactVal: 'test_id'
      };
      const result = Utils.validateItem(emptyTitleItem);
      assert.isFalse(result.isValid, '全空白标题应无法通过校验');
      assert.isTrue(result.errors.some(e => e.includes('物品名称不能为空')), '应包含名称为空的错误信息');
    }
  },

  {
    name: '测试用例 3: 物品名称超长边界（超过40字）拦截',
    category: '边界值测试 (validateItem)',
    description: '测试人员故意粘贴超长字符串（45个字符），系统应拦截并提示超长，防止数据库溢出或破坏UI。',
    testFn(assert) {
      const longTitle = '这是一段故意构造的超级长长长长长长长长长长长长长长长长长长长长长长长长长长的物品名称测试字符串';
      const item = {
        type: 'found',
        title: longTitle,
        category: '校园卡/证件',
        location: '一区食堂',
        date: '2026-10-02',
        contactType: '微信',
        contactVal: 'test_id'
      };
      const result = Utils.validateItem(item);
      assert.isFalse(result.isValid, '超过40字的标题应拦截');
      assert.isTrue(result.errors.some(e => e.includes('不能超过40个字符')), '应提示长度超限');
    }
  },

  {
    name: '测试用例 4: 手机号码格式异常拦截（防乱填纯字母/非11位）',
    category: '数据类型合规测试 (validateItem)',
    description: '当选择联系方式为“手机号”时，输入格式错误（如包含字母或少于11位），必须提示手机号不合规。',
    testFn(assert) {
      const invalidPhoneItem = {
        type: 'lost',
        title: '丢失高数课本',
        category: '书籍文具',
        location: '文科楼',
        date: '2026-10-02',
        contactType: '手机号',
        contactVal: '1388888abcd' // 包含非数字
      };
      const result = Utils.validateItem(invalidPhoneItem);
      assert.isFalse(result.isValid, '包含字母的手机号应校验失败');
      assert.isTrue(result.errors.some(e => e.includes('手机号码格式不正确')), '应指出手机号码不合法');
    }
  },

  {
    name: '测试用例 5: QQ 号码非纯数字与长度边界测试',
    category: '数据类型合规测试 (validateItem)',
    description: 'QQ 号必须为 5~12 位数字，测试人员输入过短账号（如 123）时应被正确捕获。',
    testFn(assert) {
      const shortQQItem = {
        type: 'found',
        title: '捡到钥匙',
        category: '生活钥匙',
        location: '风雨操场',
        date: '2026-10-02',
        contactType: 'QQ',
        contactVal: '123' // 过短
      };
      const result = Utils.validateItem(shortQQItem);
      assert.isFalse(result.isValid, '过短 QQ 应校验失败');
      assert.isTrue(result.errors.some(e => e.includes('5~12位纯数字')), '应提示QQ号长度规则');
    }
  },

  {
    name: '测试用例 6: 关键词模糊匹配检索（大小写不敏感与去空格）',
    category: '检索功能测试 (filterItems)',
    description: '测试当输入大写或带空格的关键词时，例如 “ airpods ”，能否精准匹配到包含“AirPods Pro”的耳机条目。',
    testFn(assert) {
      const mockList = [
        { id: 1, title: '遗落AirPods Pro耳机', desc: '黄色保护壳', location: '图书馆', type: 'lost', category: '数码电子', status: 'open' },
        { id: 2, title: '捡到学生卡', desc: '计算机学院', location: '一区食堂', type: 'found', category: '校园卡/证件', status: 'open' },
        { id: 3, title: '黑色折叠雨伞', desc: '小熊挂件', location: '西三教室', type: 'found', category: '生活钥匙', status: 'solved' }
      ];
      const matched = Utils.filterItems(mockList, { keyword: '  airpods  ' });
      assert.strictEqual(matched.length, 1, '应精准匹配到 1 条结果');
      assert.strictEqual(matched[0].id, 1, '匹配到的物品 ID 应为 1');
    }
  },

  {
    name: '测试用例 7: 多维度组合筛选（类型+分类+状态复合条件）',
    category: '逻辑组合测试 (filterItems)',
    description: '同时筛选：type=found(招领) + category=生活钥匙 + status=solved(已结贴)，验证复合条件逻辑“与”关系的准确性。',
    testFn(assert) {
      const mockList = [
        { id: 1, title: '捡到钥匙A', type: 'found', category: '生活钥匙', status: 'solved', location: '操场' },
        { id: 2, title: '捡到钥匙B', type: 'found', category: '生活钥匙', status: 'open', location: '食堂' },
        { id: 3, title: '丢失钥匙C', type: 'lost', category: '生活钥匙', status: 'solved', location: '教学楼' },
        { id: 4, title: '捡到学生卡', type: 'found', category: '校园卡/证件', status: 'solved', location: '图书馆' }
      ];
      const matched = Utils.filterItems(mockList, {
        type: 'found',
        category: '生活钥匙',
        status: 'solved'
      });
      assert.strictEqual(matched.length, 1, '仅有一条完全满足三项复合条件');
      assert.strictEqual(matched[0].id, 1, '匹配的目标 ID 应为 1');
    }
  },

  {
    name: '测试用例 8: 状态流转持久化（open -> solved 结贴状态更新）',
    category: '业务状态流转测试 (DataManager)',
    description: '测试失物归还后将信息更新为“solved”，验证状态流转是否成功持久化写入。',
    testFn(assert) {
      const testItem = {
        title: '待认领水杯',
        type: 'found',
        category: '其他物品',
        location: '田径场',
        date: '2026-10-02',
        contactType: '微信',
        contactVal: 'tester'
      };
      const created = DataManager.addItem(testItem);
      assert.strictEqual(created.status, 'open', '初始状态应为 open (进行中)');

      // 执行状态更新为已解决
      const updateSuccess = DataManager.updateItemStatus(created.id, 'solved');
      assert.isTrue(updateSuccess, '更新状态应返回成功');

      const reloaded = DataManager.getItemById(created.id);
      assert.strictEqual(reloaded.status, 'solved', '重新加载的数据状态应为 solved');

      // 清理测试数据
      DataManager.deleteItem(created.id);
    }
  },

  {
    name: '测试用例 9: 搜索高亮 XSS 注入防护（测试人员恶意脚本刁难）',
    category: '安全防护测试 (highlightKeyword & escapeHtml)',
    description: '测试人员故意在文本中注入 `<script>alert(1)</script>` 等危险标签时，高亮函数必须先做 HTML 实体转义，防止跨站脚本漏洞。',
    testFn(assert) {
      const maliciousText = '<script>alert("hack")</script>测试失物';
      const highlighted = Utils.highlightKeyword(maliciousText, '测试');
      assert.isFalse(highlighted.includes('<script>'), '不得包含未转义的 <script> 标签');
      assert.isTrue(highlighted.includes('&lt;script&gt;'), '危险字符必须被转义为安全 HTML 实体');
      assert.isTrue(highlighted.includes('<mark'), '目标关键词应被安全 mark 标签包裹');
    }
  },

  {
    name: '测试用例 10: 损坏 JSON 数据导入解析容错测试',
    category: '鲁棒性与异常恢复测试 (parseImportData)',
    description: '模拟测试人员导入破损或非法格式的 JSON 字符串，系统必须安全捕获异常，返回 success=false，而非直接崩溃白屏。',
    testFn(assert) {
      const corruptedJson = '{"version": "1.0", "data": [非法截断数据...';
      const result = Utils.parseImportData(corruptedJson);
      assert.isFalse(result.success, '损坏的 JSON 应该解析失败');
      assert.isTrue(result.message.includes('JSON 解析失败'), '应给出友好的错误原因提示');
    }
  },

  {
    name: '测试用例 11: 编辑自己的发布信息并保留业务状态',
    category: '发布管理测试 (DataManager.updateItem)',
    description: '验证编辑操作能够更新标题和地点，同时保留原有 ID、已解决状态和发布时间。',
    testFn(assert) {
      const created = DataManager.addItem({
        type: 'found',
        title: '待编辑的水杯',
        category: '其他物品',
        location: '旧地点',
        date: '2026-10-02',
        contactType: '微信',
        contactVal: 'editor_test'
      });
      DataManager.updateItemStatus(created.id, 'solved');
      const before = DataManager.getItemById(created.id);
      const updated = DataManager.updateItem(created.id, {
        title: '修改后的水杯',
        location: '新地点'
      });
      const after = DataManager.getItemById(created.id);

      assert.isTrue(updated, '自己的信息应当允许编辑');
      assert.strictEqual(after.id, before.id, '编辑不能改变信息 ID');
      assert.strictEqual(after.title, '修改后的水杯', '标题应更新');
      assert.strictEqual(after.location, '新地点', '地点应更新');
      assert.strictEqual(after.status, 'solved', '编辑不能重置已解决状态');
      assert.strictEqual(after.timestamp, before.timestamp, '编辑不能改变发布时间');
      assert.strictEqual(after.publisherName, before.publisherName, '编辑不能改变发布者');
      assert.strictEqual(after.resolvedTime, before.resolvedTime, '编辑不能改变结贴时间');
      DataManager.deleteItem(created.id);
    }
  },

  {
    name: '测试用例 12: 非本人信息禁止编辑',
    category: '权限边界测试 (DataManager.updateItem)',
    description: '验证非本人发布的信息不能通过数据管理层被修改。',
    testFn(assert) {
      const original = DataManager.getItemById(1002);
      const changed = DataManager.updateItem(1002, { title: '不应被修改' });
      const current = DataManager.getItemById(1002);
      assert.isFalse(Boolean(original && original.isMine), '测试数据应属于其他用户');
      assert.isFalse(changed, '非本人信息不应允许编辑');
      assert.strictEqual(current.title, original.title, '非本人信息标题应保持不变');
    }
  },

  {
    name: '测试用例 13: 编辑后的联系方式仍需通过格式校验',
    category: '编辑校验测试 (validateItem)',
    description: '验证编辑联系方式时仍执行与首次发布相同的手机号格式校验。',
    testFn(assert) {
      const result = Utils.validateItem({
        type: 'lost',
        title: '修改后的课本',
        category: '书籍文具',
        location: '图书馆',
        date: '2026-10-02',
        contactType: '手机号',
        contactVal: '123'
      });
      assert.isFalse(result.isValid, '非法手机号不能保存编辑结果');
      assert.isTrue(result.errors.some(e => e.includes('手机号码格式不正确')), '应返回手机号格式错误');
    }
  },
  {
    name: '测试用例 14: 非法编辑内容不会覆盖已保存的数据',
    category: '编辑校验测试 (DataManager.updateItem)',
    description: '空白标题、空白地点和错误手机号均应保存失败，原记录保持不变。',
    testFn(assert) {
      const before = DataManager.getItemById(1001);
      const invalidUpdates = [
        { title: '   ' }, { location: '   ' },
        { contactType: '手机号', contactVal: '123' }
      ];
      invalidUpdates.forEach(updates => {
        assert.isFalse(DataManager.updateItem(1001, updates), '非法内容应拒绝保存');
        assert.strictEqual(JSON.stringify(DataManager.getItemById(1001)), JSON.stringify(before), '原记录不能被覆盖');
      });
    }
  },
  {
    name: '测试用例 15: 不存在的记录不能编辑',
    category: '编辑异常测试 (DataManager.updateItem)',
    description: '记录不存在或已删除时返回失败，不创建新记录。',
    testFn(assert) {
      const before = JSON.stringify(DataManager.getItems());
      assert.isFalse(DataManager.updateItem('missing-item', { title: '不存在的物品' }));
      assert.strictEqual(JSON.stringify(DataManager.getItems()), before);
    }
  },
  {
    name: '测试用例 16: 图片移除和内部字段保护',
    category: '编辑字段测试 (DataManager.updateItem)',
    description: '允许移除原图片，但修改 ID、状态、发布时间、发布者或归属标记不会生效。',
    testFn(assert) {
      const before = DataManager.getItemById(1001);
      assert.isTrue(DataManager.updateItem(1001, {
        img: '', id: 'changed', status: 'solved', timestamp: 0,
        publisherName: 'other', isMine: false
      }));
      const after = DataManager.getItemById(1001);
      assert.strictEqual(after.img, '');
      ['id', 'status', 'timestamp', 'publisherName', 'isMine'].forEach(field => {
        assert.strictEqual(after[field], before[field], field + '应保持不变');
      });
    }
  },
  {
    name: '测试用例 17: 存储失败时不误报编辑成功',
    category: '存储异常测试 (DataManager.updateItem)',
    description: '模拟本地缓存写入失败，更新方法必须返回失败并保持原记录。',
    testFn(assert) {
      const before = JSON.stringify(DataManager.getItemById(1001));
      const saveItems = DataManager.saveItems;
      DataManager.saveItems = () => false;
      try {
        assert.isFalse(DataManager.updateItem(1001, { title: '存储失败的修改' }));
        assert.strictEqual(JSON.stringify(DataManager.getItemById(1001)), before);
      } finally {
        DataManager.saveItems = saveItems;
      }
    }
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = UnitTests;
}
