/**
 * utils.js - 校园失物招领工具函数库
 * 提供输入校验、过滤搜索、关键词高亮、日期格式化与数据导入导出等纯函数
 */

const Utils = {
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
      location = 'all',
      status = 'all'
    } = query;

    const kw = keyword.trim().toLowerCase();

    return items.filter(item => {
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

      // 4. 地点大区过滤
      if (location !== 'all' && !item.location.includes(location)) {
        return false;
      }

      // 5. 关键词模糊检索（匹配标题、描述、地点）
      if (kw) {
        const titleMatch = (item.title || '').toLowerCase().includes(kw);
        const descMatch = (item.desc || '').toLowerCase().includes(kw);
        const locMatch = (item.location || '').toLowerCase().includes(kw);
        const catMatch = (item.category || '').toLowerCase().includes(kw);
        if (!titleMatch && !descMatch && !locMatch && !catMatch) {
          return false;
        }
      }

      return true;
    });
  },

  /**
   * 搜索关键词高亮显示
   * @param {string} text 原始文本
   * @param {string} keyword 关键词
   * @returns {string} 包含 <mark> 标签的 HTML 安全文本
   */
  highlightKeyword(text, keyword) {
    if (!text) return '';
    if (!keyword || !keyword.trim()) {
      return this.escapeHtml(text);
    }

    const safeKw = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(safeKw, 'gi');
    const parts = [];
    let lastIndex = 0;
    // 在原文中查找，再分别转义匹配片段和普通片段，不拆开 HTML 实体。
    for (const match of text.matchAll(regex)) {
      parts.push(this.escapeHtml(text.slice(lastIndex, match.index)));
      parts.push('<mark class="bg-amber-200 text-amber-900 rounded px-1 font-semibold">' +
        this.escapeHtml(match[0]) + '</mark>');
      lastIndex = match.index + match[0].length;
    }
    parts.push(this.escapeHtml(text.slice(lastIndex)));
    return parts.join('');
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
