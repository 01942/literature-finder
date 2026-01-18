/**
 * Literature Finder - 学术文献检索工具
 * 支持通过 DOI、标题、作者等方式检索学术文献
 */

// ===== Constants & Configuration =====
const CONFIG = {
    crossrefAPI: 'https://api.crossref.org/works',
    semanticScholarAPI: 'https://api.semanticscholar.org/graph/v1/paper/search',
    unpayWallAPI: 'https://api.unpaywall.org/v2',
    // 多个Sci-Hub镜像站点
    scihubMirrors: [
        'https://sci-hub.se',
        'https://sci-hub.st',
        'https://sci-hub.ru',
        'https://sci-hub.ren',
        'https://sci-hub.ee',
        'https://sci-hub.wf'
    ],
    // LibGen镜像
    libgenMirrors: [
        'https://libgen.rs',
        'https://libgen.is',
        'https://libgen.st'
    ],
    // 其他下载源
    otherSources: {
        googleScholar: 'https://scholar.google.com/scholar',
        semanticScholar: 'https://www.semanticscholar.org/search',
        pubmed: 'https://pubmed.ncbi.nlm.nih.gov',
        arxiv: 'https://arxiv.org/search'
    },
    resultsPerPage: 10,
    requestTimeout: 15000,
    unpayWallEmail: 'user@example.com' // Unpaywall API需要邮箱
};

// ===== DOM Elements =====
const elements = {
    searchInput: document.getElementById('searchInput'),
    searchBtn: document.getElementById('searchBtn'),
    clearBtn: document.getElementById('clearBtn'),
    loadingState: document.getElementById('loadingState'),
    resultsSection: document.getElementById('resultsSection'),
    resultsContainer: document.getElementById('resultsContainer'),
    resultsCount: document.getElementById('resultsCount'),
    errorState: document.getElementById('errorState'),
    errorMessage: document.getElementById('errorMessage'),
    emptyState: document.getElementById('emptyState'),
    searchTypeRadios: document.querySelectorAll('input[name="searchType"]'),
    exampleBtns: document.querySelectorAll('.example-btn')
};

// ===== State =====
let currentSearchType = 'all';

// ===== Event Listeners =====
function initEventListeners() {
    // Search button click
    elements.searchBtn.addEventListener('click', handleSearch);

    // Enter key press
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    // Clear button
    elements.clearBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        elements.searchInput.focus();
    });

    // Search type change
    elements.searchTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentSearchType = e.target.value;
        });
    });

    // Example buttons
    elements.exampleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.searchInput.value = btn.dataset.query;
            elements.searchInput.focus();
        });
    });
}

// ===== Search Handler =====
async function handleSearch() {
    const query = elements.searchInput.value.trim();

    if (!query) {
        showError('请输入检索内容');
        return;
    }

    showLoading();

    try {
        let results;

        // Check if query is a DOI
        if (isDOI(query) || currentSearchType === 'doi') {
            results = await searchByDOI(query);
        } else {
            results = await searchByQuery(query, currentSearchType);
        }

        if (results && results.length > 0) {
            showResults(results);
        } else {
            showError('未找到相关文献，请尝试其他关键词');
        }
    } catch (error) {
        console.error('Search error:', error);
        showError('检索失败: ' + (error.message || '网络错误，请稍后重试'));
    }
}

// ===== API Functions =====

/**
 * Check if a string is a DOI
 */
function isDOI(str) {
    const doiPattern = /^10\.\d{4,}\/[^\s]+$/i;
    return doiPattern.test(str.trim());
}

/**
 * Extract DOI from various formats
 */
function extractDOI(str) {
    // Match DOI pattern
    const doiMatch = str.match(/10\.\d{4,}\/[^\s]+/i);
    if (doiMatch) {
        return doiMatch[0];
    }
    return str;
}

/**
 * Search by DOI using CrossRef API
 */
async function searchByDOI(doi) {
    const cleanDOI = extractDOI(doi);
    const url = `${CONFIG.crossrefAPI}/${encodeURIComponent(cleanDOI)}`;

    const response = await fetchWithTimeout(url);
    const data = await response.json();

    if (data.message) {
        return [formatCrossRefResult(data.message)];
    }

    return [];
}

/**
 * Search by query using CrossRef API
 */
async function searchByQuery(query, searchType) {
    let url = `${CONFIG.crossrefAPI}?rows=${CONFIG.resultsPerPage}`;

    switch (searchType) {
        case 'title':
            url += `&query.title=${encodeURIComponent(query)}`;
            break;
        case 'author':
            url += `&query.author=${encodeURIComponent(query)}`;
            break;
        default:
            url += `&query=${encodeURIComponent(query)}`;
    }

    const response = await fetchWithTimeout(url);
    const data = await response.json();

    if (data.message && data.message.items) {
        return data.message.items.map(formatCrossRefResult);
    }

    return [];
}

/**
 * Format CrossRef API result
 */
function formatCrossRefResult(item) {
    return {
        title: item.title ? item.title[0] : 'Untitled',
        authors: formatAuthors(item.author),
        year: item.published ?
            (item.published['date-parts'] ? item.published['date-parts'][0][0] : '') :
            (item.created ? item.created['date-parts'][0][0] : ''),
        journal: item['container-title'] ? item['container-title'][0] : '',
        doi: item.DOI || '',
        url: item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : ''),
        abstract: item.abstract ? cleanAbstract(item.abstract) : '',
        type: item.type || 'article',
        citations: item['is-referenced-by-count'] || 0,
        publisher: item.publisher || ''
    };
}

/**
 * Format authors array
 */
function formatAuthors(authors) {
    if (!authors || authors.length === 0) return 'Unknown authors';

    const formatted = authors.slice(0, 5).map(author => {
        if (author.family && author.given) {
            return `${author.family}, ${author.given.charAt(0)}.`;
        }
        return author.name || author.family || 'Unknown';
    });

    if (authors.length > 5) {
        formatted.push('et al.');
    }

    return formatted.join('; ');
}

/**
 * Clean abstract text
 */
function cleanAbstract(abstract) {
    // Remove JATS XML tags
    return abstract
        .replace(/<[^>]*>/g, '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .trim();
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.requestTimeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        return response;
    } finally {
        clearTimeout(timeout);
    }
}

// ===== UI Functions =====

/**
 * Show loading state
 */
function showLoading() {
    elements.emptyState.classList.add('hidden');
    elements.errorState.classList.add('hidden');
    elements.resultsSection.classList.add('hidden');
    elements.loadingState.classList.remove('hidden');
}

/**
 * Show results
 */
function showResults(results) {
    elements.loadingState.classList.add('hidden');
    elements.emptyState.classList.add('hidden');
    elements.errorState.classList.add('hidden');

    elements.resultsCount.textContent = `找到 ${results.length} 条结果`;
    elements.resultsContainer.innerHTML = results.map((result, index) =>
        createResultCard(result, index)
    ).join('');

    elements.resultsSection.classList.remove('hidden');
}

/**
 * Show error state
 */
function showError(message) {
    elements.loadingState.classList.add('hidden');
    elements.emptyState.classList.add('hidden');
    elements.resultsSection.classList.add('hidden');

    elements.errorMessage.textContent = message;
    elements.errorState.classList.remove('hidden');
}

/**
 * Create result card HTML
 */
function createResultCard(result, index) {
    const doiUrl = result.doi ? `https://doi.org/${result.doi}` : '';

    // 生成所有Sci-Hub镜像链接
    const scihubLinks = result.doi ? CONFIG.scihubMirrors.map((mirror, i) =>
        `<a href="${mirror}/${result.doi}" target="_blank" rel="noopener" class="dropdown-item">
            Sci-Hub 镜像 ${i + 1}
        </a>`
    ).join('') : '';

    // 生成LibGen搜索链接
    const libgenSearch = result.title ?
        `${CONFIG.libgenMirrors[0]}/scimag/?q=${encodeURIComponent(result.title)}` : '';

    // 生成其他搜索链接
    const scholarUrl = result.title ?
        `${CONFIG.otherSources.googleScholar}?q=${encodeURIComponent(result.title)}` : '';
    const semanticUrl = result.title ?
        `${CONFIG.otherSources.semanticScholar}?q=${encodeURIComponent(result.title)}` : '';

    // Unpaywall 开放获取链接
    const unpayWallUrl = result.doi ?
        `${CONFIG.unpayWallAPI}/${result.doi}?email=${CONFIG.unpayWallEmail}` : '';

    return `
        <article class="result-card" style="animation-delay: ${index * 0.05}s" data-doi="${result.doi || ''}">
            <h4 class="result-title">
                <a href="${result.url || doiUrl}" target="_blank" rel="noopener">
                    ${escapeHtml(result.title)}
                </a>
            </h4>
            
            <p class="result-authors">${escapeHtml(result.authors)}</p>
            
            <div class="result-meta">
                ${result.year ? `
                    <span class="meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        ${result.year}
                    </span>
                ` : ''}
                
                ${result.journal ? `
                    <span class="meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                        </svg>
                        ${escapeHtml(truncate(result.journal, 50))}
                    </span>
                ` : ''}
                
                ${result.citations > 0 ? `
                    <span class="meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        ${result.citations} 引用
                    </span>
                ` : ''}
            </div>
            
            ${result.abstract ? `
                <p class="result-abstract">${escapeHtml(result.abstract)}</p>
            ` : ''}
            
            <div class="result-actions">
                ${doiUrl ? `
                    <a href="${doiUrl}" target="_blank" rel="noopener" class="action-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                        DOI原文
                    </a>
                ` : ''}
                
                ${result.doi ? `
                    <div class="dropdown">
                        <button class="action-btn primary dropdown-toggle" onclick="toggleDropdown(this)">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            下载 PDF ▼
                        </button>
                        <div class="dropdown-menu">
                            <div class="dropdown-section">
                                <div class="dropdown-label">🔓 开放获取</div>
                                <a href="javascript:void(0)" onclick="checkUnpaywall('${result.doi}')" class="dropdown-item">
                                    检查 Unpaywall
                                </a>
                            </div>
                            <div class="dropdown-section">
                                <div class="dropdown-label">📚 Sci-Hub 镜像</div>
                                ${scihubLinks}
                            </div>
                            <div class="dropdown-section">
                                <div class="dropdown-label">📖 LibGen</div>
                                <a href="${libgenSearch}" target="_blank" rel="noopener" class="dropdown-item">
                                    在 LibGen 搜索
                                </a>
                                <a href="${CONFIG.libgenMirrors[1]}/scimag/?q=${encodeURIComponent(result.title || '')}" target="_blank" rel="noopener" class="dropdown-item">
                                    LibGen 镜像 2
                                </a>
                            </div>
                        </div>
                    </div>
                ` : ''}
                
                <button class="action-btn" onclick="copyDOI('${result.doi}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    复制引用
                </button>
                
                <a href="${scholarUrl}" target="_blank" rel="noopener" class="action-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    Google Scholar
                </a>
            </div>
        </article>
    `;
}

// ===== Utility Functions =====

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Truncate text
 */
function truncate(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Copy DOI to clipboard
 */
function copyDOI(doi) {
    if (!doi) return;

    const citation = `DOI: ${doi}\nURL: https://doi.org/${doi}`;

    navigator.clipboard.writeText(citation).then(() => {
        showToast('已复制到剪贴板');
    }).catch(err => {
        console.error('Copy failed:', err);
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = citation;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('已复制到剪贴板');
    });
}

/**
 * Search on Google Scholar
 */
function searchOnGoogle(title) {
    const url = `https://scholar.google.com/scholar?q=${encodeURIComponent(title)}`;
    window.open(url, '_blank');
}

/**
 * Show toast notification
 */
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        z-index: 1000;
        animation: fadeInUp 0.3s ease;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', initEventListeners);

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown')) {
        document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
            menu.classList.remove('show');
        });
    }
});

/**
 * Toggle dropdown menu
 */
function toggleDropdown(btn) {
    const menu = btn.nextElementSibling;
    const isOpen = menu.classList.contains('show');

    // Close all other dropdowns
    document.querySelectorAll('.dropdown-menu.show').forEach(m => {
        m.classList.remove('show');
    });

    if (!isOpen) {
        menu.classList.add('show');
    }
}

/**
 * Check Unpaywall for open access version
 */
async function checkUnpaywall(doi) {
    if (!doi) {
        showToast('无法获取 DOI');
        return;
    }

    showToast('正在检查开放获取版本...');

    try {
        const url = `${CONFIG.unpayWallAPI}/${doi}?email=${CONFIG.unpayWallEmail}`;
        const response = await fetchWithTimeout(url);
        const data = await response.json();

        if (data.is_oa && data.best_oa_location && data.best_oa_location.url_for_pdf) {
            // Found open access PDF
            showToast('找到开放获取版本！正在打开...');
            window.open(data.best_oa_location.url_for_pdf, '_blank');
        } else if (data.is_oa && data.best_oa_location && data.best_oa_location.url) {
            // Found open access landing page
            showToast('找到开放获取页面！');
            window.open(data.best_oa_location.url, '_blank');
        } else {
            showToast('未找到开放获取版本，请尝试其他下载源');
        }
    } catch (error) {
        console.error('Unpaywall check failed:', error);
        showToast('检查失败，请尝试其他下载源');
    }
}

/**
 * Open all Sci-Hub mirrors to try downloading
 */
function tryAllMirrors(doi) {
    if (!doi) return;

    showToast('正在尝试所有镜像...');

    CONFIG.scihubMirrors.forEach((mirror, index) => {
        setTimeout(() => {
            window.open(`${mirror}/${doi}`, '_blank');
        }, index * 500);
    });
}
