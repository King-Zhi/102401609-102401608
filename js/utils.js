/**
 * utils.js - 校园失物招领工具函数库
 * 提供输入校验、过滤搜索、关键词高亮、日期格式化与数据导入导出等纯函数
 */

const Utils = {
  validateImageFile(file) {
    const extensions = {
      'image/png': /\.png$/i,
      'image/jpeg': /\.jpe?g$/i,
      'image/webp': /\.webp$/i
    };
    if (!file || !Object.prototype.hasOwnProperty.call(extensions, file.type) ||
        typeof file.name !== 'string' || !extensions[file.type].test(file.name)) {
      return { isValid: false, message: '请选择 PNG、JPG 或 WEBP 格式的图片' };
    }
    if (!Number.isFinite(file.size) || file.size <= 0) {
      return { isValid: false, message: '图片文件为空或无法读取，请重新选择' };
    }
    if (file.size > 2 * 1024 * 1024) {
      return { isValid: false, message: '图片不能超过 2MB，请选择较小的图片' };
    }
    return { isValid: true, message: '' };
  },

  // 福州大学七大校区官方标准名单
  CAMPUSES: [
    '旗山校区',
    '铜盘校区',
    '怡山校区',
    '泉港校区',
    '晋江校区',
    '厦门集美校区',
    '厦门鼓浪屿校区'
  ],

  /**
   * 从地点文本或校区属性中识别所属校区（支持简称与关联词模糊识别）
   * @param {string|Object} target 地点字符串或物品对象
   * @returns {string} 规范校区名称
   */
  detectCampus(target = '') {
    const loc = typeof target === 'object' && target !== null
      ? (target.campus || target.location || '')
      : String(target || '');

    // 精确匹配与长词优先
    for (const c of this.CAMPUSES) {
      if (loc.includes(c)) return c;
    }
    // 简称/关键字识别
    if (loc.includes('鼓浪屿')) return '厦门鼓浪屿校区';
    if (loc.includes('集美') || loc.includes('厦门') || loc.includes('工艺美院')) return '厦门集美校区';
    if (loc.includes('铜盘')) return '铜盘校区';
    if (loc.includes('怡山') || loc.includes('至诚')) return '怡山校区';
    if (loc.includes('泉港') || loc.includes('石化')) return '泉港校区';
    if (loc.includes('晋江')) return '晋江校区';
    if (loc.includes('旗山')) return '旗山校区';

    // 默认福州大学办学主体：旗山校区
    return '旗山校区';
  },

  formatLocalDate(date = new Date()) {
    const year = String(date.getFullYear()).padStart(4, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * 表单与物品数据校验
   * @param {Object} item 物品对象
   * @param {Date} today 参考日期，默认使用浏览器本地日期
   * @returns {Object} { isValid: boolean, errors: string[] }
   */
  validateItem(item, today = new Date()) {
    const errors = [];
    if (!item || typeof item !== 'object') {
      return { isValid: false, errors: ['数据对象为空或格式非法'] };
    }

    // 标题校验：必填，2~40字
    const title = (item.title || '').trim();
    if (!title) {
      errors.push('物品名称不能为空');
    } else if (title.length < 2) {
      errors.push('物品名称至少需要2个字符');
    } else if (title.length > 40) {
      errors.push('物品名称不能超过40个字符');
    }

    // 类型校验：lost 或 found
    if (!['lost', 'found'].includes(item.type)) {
      errors.push('信息类型必须为“寻物(lost)”或“招领(found)”');
    }

    // 分类校验：必选有效分类
    const validCategories = ['校园卡/证件', '数码电子', '书籍文具', '生活钥匙', '其他物品'];
    if (!validCategories.includes(item.category)) {
      errors.push('物品分类必须在预设分类范围内');
    }

    // 地点校验：必填，2~50字
    const location = (item.location || '').trim();
    if (!location) {
      errors.push('发生地点不能为空');
    } else if (location.length < 2) {
      errors.push('地点描述至少需要2个字符');
    } else if (location.length > 50) {
      errors.push('地点描述不能超过50个字符');
    }

    // 校区校验（可选/默认兼容）：若明确提供校区，须符合福州大学预设校区范围
    if (item.campus && !this.CAMPUSES.includes(item.campus)) {
      errors.push('所属校区必须在预设的福州大学校区范围内');
    }

    const dateParts = typeof item.date === 'string' && /^(\d{4})-(\d{2})-(\d{2})$/.exec(item.date);
    const calendarDate = dateParts ? new Date(item.date + 'T00:00:00Z') : null;
    // 回查年月日，防止 Date 将二月三十日等非法日期自动进位。
    const validDate = dateParts && Number(dateParts[1]) >= 1 &&
      calendarDate.getUTCFullYear() === Number(dateParts[1]) &&
      calendarDate.getUTCMonth() + 1 === Number(dateParts[2]) &&
      calendarDate.getUTCDate() === Number(dateParts[3]);
    if (!validDate) {
      errors.push('发生时间必须是有效的日期');
    } else if (item.date > this.formatLocalDate(today)) {
      errors.push('遗失或拾获日期不能晚于今天');
    }

    // 联系方式校验：必填，微信号/QQ/手机号格式合规
    const contactVal = (item.contactVal || '').trim();
    const contactType = item.contactType || '微信';
    if (!contactVal) {
      errors.push('联系方式不能为空');
    } else {
      if (contactType === '手机号') {
        const phoneRegex = /^1[3-9]\d{9}$/;
        if (!phoneRegex.test(contactVal)) {
          errors.push('手机号码格式不正确，请输入11位中国大陆手机号');
        }
      } else if (contactType === 'QQ') {
        const qqRegex = /^[1-9]\d{4,11}$/;
        if (!qqRegex.test(contactVal)) {
          errors.push('QQ号码格式不正确，应为5~12位纯数字');
        }
      } else if (contactType === '微信') {
        if (/\s/.test(contactVal)) {
          errors.push('微信号不能包含空格');
        } else {
          const wxRegex = /^([a-zA-Z][-_a-zA-Z0-9]{5,19}|1[3-9]\d{9})$/;
          if (!wxRegex.test(contactVal)) {
            errors.push('微信号格式不正确，应为6~20位以字母开头的字母、数字、下划线或减号（亦可为11位手机号）');
          }
        }
      } else if (contactVal.length < 3) {
        errors.push('联系账号长度至少需要3个字符');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * 多条件联合检索与过滤
   * @param {Array} items 物品列表
   * @param {Object} query 查询条件 { keyword, type, category, location, status }
   * @returns {Array} 过滤后的列表
   */
  filterItems(items, query = {}) {
    if (!Array.isArray(items)) return [];

    const {
      keyword = '',
      type = 'all',
      category = 'all',
      campus = 'all',
      location = 'all',
      status = 'all'
    } = query;

    const kw = keyword.trim().toLowerCase();

    const filtered = items.filter(item => {
      // 1. 类型过滤 (lost/found)
      if (type !== 'all' && item.type !== type) {
        return false;
      }

      // 2. 分类过滤
      if (category !== 'all' && item.category !== category) {
        return false;
      }

      // 3. 状态过滤 (open: 进行中, solved: 已解决)
      if (status !== 'all' && item.status !== status) {
        return false;
      }

      // 4. 校区过滤
      if (campus && campus !== 'all') {
        const itemCampus = item.campus || this.detectCampus(item);
        if (itemCampus !== campus && !String(item.location || '').includes(campus)) {
          return false;
        }
      }

      // 5. 地点大区过滤
      if (location !== 'all' && !item.location.includes(location)) {
        return false;
      }

      // 6. 关键词多维度智能模糊匹配（支持直接包含、校园简称与子序列模糊）
      if (kw) {
        const fields = [item.title, item.desc, item.location, item.category, item.campus || ''];
        const hasMatch = fields.some(field => this.matchKeyword(field, kw));
        if (!hasMatch) {
          return false;
        }
      }

      return true;
    });

    // 6. 智能排序与分层展示：
    // 规则 A（状态分层）：进行中（open）的帖子优先排在前面，已解决（solved）的帖子自动往后排，避免穿插混乱
    // 规则 B（搜索相关度）：在相同状态内部，若存在搜索词，则按相关度得分降序（标题 > 地点 > 分类 > 描述）
    const calculateScore = kw ? (item) => {
      let score = 0;
      const titleLower = (item.title || '').toLowerCase();
      const locLower = (item.location || '').toLowerCase();
      const descLower = (item.desc || '').toLowerCase();

      // 标题命中（最高权重）
      if (titleLower.includes(kw)) {
        score += 100;
      } else if (this.matchKeyword(item.title, kw)) {
        score += 70;
      }

      // 地点命中
      if (locLower.includes(kw)) {
        score += 40;
      } else if (this.matchKeyword(item.location, kw)) {
        score += 25;
      }

      // 校区命中
      const campusLower = (item.campus || '').toLowerCase();
      if (campusLower && campusLower.includes(kw)) {
        score += 35;
      }

      // 分类命中
      if (this.matchKeyword(item.category, kw)) {
        score += 20;
      }

      // 详细描述命中（补充权重）
      if (descLower.includes(kw)) {
        score += 15;
      } else if (item.desc && this.matchKeyword(item.desc, kw)) {
        score += 10;
      }

      return score;
    } : null;

    return filtered.slice().sort((a, b) => {
      // 1. 状态分层：未解决（open）优先，已解决（solved）沉底往后排
      const isSolvedA = a.status === 'solved' ? 1 : 0;
      const isSolvedB = b.status === 'solved' ? 1 : 0;
      if (isSolvedA !== isSolvedB) {
        return isSolvedA - isSolvedB;
      }

      // 2. 搜索相关度排序（仅在相同状态且存在关键词时比较）
      if (calculateScore) {
        const scoreDiff = calculateScore(b) - calculateScore(a);
        if (scoreDiff !== 0) {
          return scoreDiff;
        }
      }

      return 0;
    });
  },

  /**
   * 智能模糊匹配算法
   * 支持：直接连续包含、校园常用课程与物品简称映射、子序列模糊匹配（如“高数”匹配“高等数学”）
   * @param {string} text 目标字段文本
   * @param {string} keyword 搜索词
   * @returns {boolean} 是否命中
   */
  matchKeyword(text, keyword) {
    if (!text || typeof text !== 'string') return false;
    if (!keyword || typeof keyword !== 'string') return false;

    const src = text.toLowerCase();
    const kw = keyword.trim().toLowerCase();
    if (!kw) return true;

    // 1. 直接包含（最高优先级，精准匹配）
    if (src.includes(kw)) return true;

    // 2. 校园专属常用简称与近义词库（如“高数”对应“高等数学”）
    const aliasMap = {
      '高数': ['高等数学', '数学'],
      '高等数学': ['高数'],
      '线代': ['线性代数'],
      '大物': ['大学物理'],
      '马原': ['马克思'],
      '毛概': ['毛泽东思想'],
      '思修': ['思想道德'],
      '一卡通': ['校园卡', '学生卡', '卡'],
      '饭卡': ['校园卡', '学生卡', '卡'],
      '学生卡': ['校园卡', '一卡通', '饭卡'],
      '校园卡': ['学生卡', '一卡通', '饭卡'],
      '耳机': ['airpods', '蓝牙耳机', '耳机'],
      '雨伞': ['折叠伞', '晴雨伞', '雨伞'],
      '折叠伞': ['雨伞', '晴雨伞'],
      '钥匙': ['宿舍钥匙', '门禁钥匙'],
      '水杯': ['保温杯', '水杯', '保温水杯'],
      '保温杯': ['水杯', '膳魔师', '保温水杯']
    };

    for (const [key, aliases] of Object.entries(aliasMap)) {
      if (kw === key || kw.includes(key)) {
        if (aliases.some(alias => src.includes(alias))) return true;
      }
      if (aliases.includes(kw) && src.includes(key)) return true;
    }

    // 3. 字符子序列模糊匹配（每个字符按序在原文中出现，如“高数”命中“高等数学第七版”）
    const chars = [...kw].filter(c => c.trim().length > 0);
    if (chars.length >= 2) {
      let pIndex = 0;
      for (let i = 0; i < src.length; i++) {
        if (src[i] === chars[pIndex]) {
          pIndex++;
          if (pIndex === chars.length) return true;
        }
      }
    }

    return false;
  },

  /**
   * 搜索关键词高亮显示（支持连续匹配与模糊子序列高亮）
   * @param {string} text 原始文本
   * @param {string} keyword 关键词
   * @returns {string} 包含 <mark> 标签的 HTML 安全文本
   */
  highlightKeyword(text, keyword) {
    if (!text) return '';
    if (!keyword || !keyword.trim()) {
      return this.escapeHtml(text);
    }

    const cleanKw = keyword.trim();
    const safeKw = cleanKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(safeKw, 'gi');
    const parts = [];
    let lastIndex = 0;
    let hasExactMatch = false;

    // 在原文中查找，再分别转义匹配片段和普通片段，不拆开 HTML 实体。
    for (const match of text.matchAll(regex)) {
      hasExactMatch = true;
      parts.push(this.escapeHtml(text.slice(lastIndex, match.index)));
      parts.push('<mark class="bg-amber-200 text-amber-900 rounded px-1 font-semibold">' +
        this.escapeHtml(match[0]) + '</mark>');
      lastIndex = match.index + match[0].length;
    }

    if (hasExactMatch) {
      parts.push(this.escapeHtml(text.slice(lastIndex)));
      return parts.join('');
    }

    // 若无整词连续命中，则对子序列模糊匹配（如“高数”在“高等数学”中）高亮命中的单个字符
    const kwChars = [...cleanKw.toLowerCase()].filter(c => c.trim().length > 0);
    if (kwChars.length >= 2) {
      const srcLower = text.toLowerCase();
      const matchedIndices = new Set();
      let pIdx = 0;
      for (let i = 0; i < text.length; i++) {
        if (srcLower[i] === kwChars[pIdx]) {
          matchedIndices.add(i);
          pIdx++;
          if (pIdx === kwChars.length) break;
        }
      }

      if (pIdx === kwChars.length) {
        let result = '';
        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          if (matchedIndices.has(i)) {
            result += '<mark class="bg-amber-200 text-amber-900 rounded px-1 font-semibold">' + this.escapeHtml(char) + '</mark>';
          } else {
            result += this.escapeHtml(char);
          }
        }
        return result;
      }
    }

    return this.escapeHtml(text);
  },

  /**
   * 从长文本（如详细描述）中提取包含关键词的上下文高亮摘要
   * @param {string} text 原始长文本
   * @param {string} keyword 搜索词
   * @param {number} maxLen 摘要窗口大小（默认约 28 个字符）
   * @returns {string} 包含 <mark> 高亮标签的安全 HTML 摘要片段
   */
  extractSnippet(text, keyword, maxLen = 28) {
    if (!text || typeof text !== 'string') return '';
    if (!keyword || typeof keyword !== 'string' || !keyword.trim()) return '';

    const cleanKw = keyword.trim();
    const lowerText = text.toLowerCase();
    const lowerKw = cleanKw.toLowerCase();

    // 1. 优先查找连续子串匹配位置
    let matchIdx = lowerText.indexOf(lowerKw);

    // 2. 如果未直接包含，查找子序列首字符位置
    if (matchIdx === -1) {
      const chars = [...lowerKw].filter(c => c.trim().length > 0);
      if (chars.length > 0) {
        matchIdx = lowerText.indexOf(chars[0]);
      }
    }

    // 3. 计算截取窗口（前后对称扩展）
    if (matchIdx === -1) {
      const sub = text.slice(0, maxLen);
      return this.highlightKeyword(sub, cleanKw) + (text.length > maxLen ? '…' : '');
    }

    const half = Math.floor(maxLen / 2);
    let start = Math.max(0, matchIdx - half);
    let end = Math.min(text.length, start + maxLen);
    if (end - start < maxLen && start > 0) {
      start = Math.max(0, end - maxLen);
    }

    const snippet = text.slice(start, end);
    const prefix = start > 0 ? '…' : '';
    const suffix = end < text.length ? '…' : '';

    return prefix + this.highlightKeyword(snippet, cleanKw) + suffix;
  },

  /**
   * HTML 转义防 XSS
   */
  escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  /**
   * 友好时间跨度转换
   * @param {string|number|Date} dateVal 发生日期
   * @returns {string} 相对时间标签
   */
  timeAgo(dateVal) {
    if (!dateVal) return '未知时间';
    const timestamp = new Date(dateVal).getTime();
    if (isNaN(timestamp)) return '未知时间';

    const now = Date.now();
    const diff = (now - timestamp) / 1000; // 秒

    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
    if (diff < 86400 * 2) return '昨天';
    if (diff < 86400 * 3) return '2天前';
    if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}天前`;

    // 格式化为 YYYY-MM-DD
    const d = new Date(timestamp);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  },

  /**
   * 隐私脱敏处理（例如校园卡隐藏学号中间位、手机号脱敏）
   */
  maskSensitive(str, type) {
    if (!str) return '';
    if (type === '手机号' && /^1\d{10}$/.test(str)) {
      return str.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    }
    if (type === '校园卡') {
      // 保留首位和末位
      if (str.length > 4) {
        return str.substring(0, 2) + '****' + str.substring(str.length - 2);
      }
    }
    return str;
  },

  /**
   * 备份导出为 JSON 字符串
   */
  exportToJson(items) {
    return JSON.stringify({
      version: '1.0',
      exportTime: new Date().toISOString(),
      count: items.length,
      data: items
    }, null, 2);
  },

  /**
   * 安全解析导入的 JSON 数据
   */
  parseImportData(jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      const list = Array.isArray(parsed) ? parsed : (parsed.data || []);
      if (!Array.isArray(list)) {
        return { success: false, message: '数据格式有误，必须为数组格式' };
      }
      return { success: true, data: list };
    } catch (e) {
      return { success: false, message: 'JSON 解析失败：' + e.message };
    }
  }
};

// 兼容浏览器端和 Node.js 单元测试环境
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
}
