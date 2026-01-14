// 引入角色汇总数据
import { characterData } from './data/data-zh-cn.js';
import { initCustomSelectDisplay } from './components/select.js';
import { supabase } from './supabase.js';

// 声明全局变量
let currentUser = null;

// DOM元素变量声明
let authStatusSection, authStatusText, authModalTrigger, authModal, authModalClose;
let authTabLogin, authTabSignup, authFormLogin, authFormSignup;
let authEmail, authPassword, authButton, authEmailSignup, authPasswordSignup;
let authSignupButton, authLogoutButton, authMessage;

// 弹窗交互逻辑
function openAuthModal() {
    if (authModal) {
        authModal.style.display = 'block';
        // 默认显示登录选项卡
        showLoginTab();
    }
}

function closeAuthModal() {
    if (authModal) {
        authModal.style.display = 'none';
    }
    // 清除表单和消息
    if (authEmail && authPassword && authEmailSignup && authPasswordSignup && authMessage) {
        authEmail.value = '';
        authPassword.value = '';
        authEmailSignup.value = '';
        authPasswordSignup.value = '';
        authMessage.textContent = '';
    }
}

function showLoginTab() {
    if (authTabLogin && authTabSignup && authFormLogin && authFormSignup) {
        authTabLogin.classList.add('active');
        authTabSignup.classList.remove('active');
        authFormLogin.style.display = 'block';
        authFormSignup.style.display = 'none';
    }
}

function showSignupTab() {
    if (authTabLogin && authTabSignup && authFormLogin && authFormSignup) {
        authTabSignup.classList.add('active');
        authTabLogin.classList.remove('active');
        authFormSignup.style.display = 'block';
        authFormLogin.style.display = 'none';
    }
}

// 设置认证相关功能
function setupAuthFeatures() {
    // Supabase 认证状态监听
    supabase.auth.onAuthStateChange((event, session) => {
        if (session && authStatusText && authLogoutButton && authModalTrigger) {
            currentUser = session.user;
            authStatusText.textContent = `已登录: ${currentUser.email}`;
            authLogoutButton.style.display = 'block';
            authModalTrigger.style.display = 'none';
            // 登录成功后，清空输入框并关闭弹窗
            closeAuthModal();
            // 用户登录后，尝试从云端同步数据
            syncDataFromSupabase();
        } else if (authStatusText && authLogoutButton && authModalTrigger) {
            currentUser = null;
            authStatusText.textContent = '未登录';
            authLogoutButton.style.display = 'none';
            authModalTrigger.style.display = 'inline-block';
            // 登出后，清空输入框
            if (authEmail && authPassword && authEmailSignup && authPasswordSignup) {
                authEmail.value = '';
                authPassword.value = '';
                authEmailSignup.value = '';
                authPasswordSignup.value = '';
            }
            // 用户登出后，清空本地数据或切换回本地存储
            localStorage.removeItem('completedTasks');
            renderView();
        }
        updateIncompleteCount();
        updateTaskCounts();
    });

    // 注册功能
    if (authSignupButton && authEmailSignup && authPasswordSignup && authMessage) {
        authSignupButton.addEventListener('click', async () => {
            const email = authEmailSignup.value;
            const password = authPasswordSignup.value;
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
            });
            if (error) {
                authMessage.textContent = `注册失败: ${error.message}`;
                console.error('注册失败:', error);
            } else if (data.user) {
                authMessage.textContent = '注册成功，请检查您的邮箱进行验证。';
                // 注册成功后清空密码，但保留邮箱
                authPasswordSignup.value = '';
            } else {
                authMessage.textContent = '注册成功，但未返回用户数据。';
                // 注册成功后清空密码，但保留邮箱
                authPasswordSignup.value = '';
            }
        });
    }

    // 登录功能
    if (authButton && authEmail && authPassword && authMessage) {
        authButton.addEventListener('click', async () => {
            const email = authEmail.value;
            const password = authPassword.value;
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });
            if (error) {
                authMessage.textContent = `登录失败: ${error.message}`;
                console.error('登录失败:', error);
            } else if (data.user) {
                authMessage.textContent = `登录成功: ${data.user.email}`;
                // 登录成功后清空密码
                authPassword.value = '';
                // 延迟关闭弹窗，让用户看到成功消息
                setTimeout(() => {
                    closeAuthModal();
                }, 1000);
            } else {
                authMessage.textContent = '登录成功，但未返回用户数据。';
                // 登录成功后清空密码
                authPassword.value = '';
            }
        });
    }

    // 登出功能
    if (authLogoutButton && authMessage && authStatusText) {
        authLogoutButton.addEventListener('click', async () => {
            const { error } = await supabase.auth.signOut();
            if (error) {
                authMessage.textContent = `登出失败: ${error.message}`;
                console.error('登出失败:', error);
            } else {
                authStatusText.textContent = '已登出';
                // 登出后清空输入框
                if (authEmail && authPassword && authEmailSignup && authPasswordSignup) {
                    authEmail.value = '';
                    authPassword.value = '';
                    authEmailSignup.value = '';
                    authPasswordSignup.value = '';
                }
            }
        });
    }
}

// 导出数据功能
const exportData = function() {
    const completedTasks = getCompletedTasks();
    const dataStr = JSON.stringify(completedTasks, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `geshin-anecdote-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// 导入数据功能
const importData = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            // 验证导入的数据结构
            if (typeof importedData === 'object') {
                if (currentUser) {
                    // 如果已登录，上传到Supabase
                    const { error } = await supabase
                        .from('completed_tasks')
                        .upsert({ user_id: currentUser.id, tasks: importedData }, { onConflict: 'user_id' });
                    if (error) {
                        alert(`数据上传到云端失败: ${error.message}`);
                        console.error('上传数据到Supabase时出错:', error);
                    } else {
                        alert('数据导入成功并已同步到云端！页面将刷新以显示最新数据。');
                        renderView();
                    }
                } else {
                    // 未登录，保存到本地存储
                    localStorage.setItem('completedTasks', JSON.stringify(importedData));
                    alert('数据导入成功！页面将刷新以显示最新数据。');
                    renderView();
                }
            } else {
                alert('无效的数据格式！请确保导入的是正确的JSON文件。');
            }
        } catch (error) {
            alert('数据解析错误！请确保导入的是有效的JSON文件。');
            console.error('导入数据时出错:', error);
        }
    };
    reader.readAsText(file);
    // 重置文件输入，以便可以重复选择同一个文件
    event.target.value = '';
};

// DOM 加载完成后执行 - 合并所有初始化代码到一个监听器
document.addEventListener('DOMContentLoaded', async function() {
    // 获取认证相关DOM元素
    authStatusSection = document.querySelector('.auth-status-section');
    authStatusText = document.getElementById('auth-status');
    authModalTrigger = document.getElementById('auth-signin-trigger');
    authModal = document.getElementById('auth-modal');
    authModalClose = document.querySelector('#auth-modal .close');
    
    authTabLogin = document.getElementById('signin-tab');
    authTabSignup = document.getElementById('signup-tab');
    authFormLogin = document.getElementById('signin-form');
    authFormSignup = document.getElementById('signup-form');
    
    authEmail = document.getElementById('auth-email');
    authPassword = document.getElementById('auth-password');
    authButton = document.getElementById('auth-signin');
    authEmailSignup = document.getElementById('auth-email-signup');
    authPasswordSignup = document.getElementById('auth-password-signup');
    authSignupButton = document.getElementById('auth-signup');
    authLogoutButton = document.getElementById('auth-signout');
    authMessage = document.getElementById('auth-message');

    // 加载并显示前置弹窗
    loadPrePopup();
    
    // 设置认证功能
    setupAuthFeatures();
    
    // 检查当前认证状态
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        currentUser = user;
        if (authStatusText) {
            authStatusText.textContent = `已登录: ${currentUser.email}`;
        }
        if (authLogoutButton) {
            authLogoutButton.style.display = 'block';
        }
        if (authModalTrigger) {
            authModalTrigger.style.display = 'none';
        }
        // 用户登录后，尝试从云端同步数据
        syncDataFromSupabase();
    }
    
    // 渲染初始视图
    await renderView();
    
    // 添加事件监听器
    addEventListeners();
    
    // 初始化回到顶部按钮
    initScrollTopButton();
    
    // 初始化自定义选择框显示
    initCustomSelectDisplay();
    
    // 添加窗口大小变化监听器，实现响应式切换
    window.addEventListener('resize', async () => {
        await renderView();
    });
    
    // 为导出/导入按钮添加事件监听器
    document.getElementById('export-data')?.addEventListener('click', exportData);
    document.getElementById('import-data')?.addEventListener('change', importData);
    
    // 初始化未完成任务数量显示
    await updateIncompleteCount();
    
    // 初始化任务计数显示
    updateTaskCounts();
    
    // 为反馈按钮添加点击事件监听器
    const feedbackBtn = document.getElementById('feedback-btn');
    if (feedbackBtn) {
        feedbackBtn.addEventListener('click', function() {
            window.open('https://wj.qq.com/s2/24219207/e16c/', '_blank');
        });
    }
    
    // 关闭弹窗函数 - 提取为共享函数，供所有弹窗使用
    function closeModal(modal) {
        const modalContent = modal.querySelector('.modal-content');
        // 添加关闭动画类
        modal.classList.add('fade-out');
        modalContent.classList.add('slide-out');
        
        // 动画结束后隐藏弹窗
        setTimeout(() => {
            modal.style.display = 'none';
            // 移除动画类，以便下次打开时重新触发动画
            modal.classList.remove('fade-out');
            modalContent.classList.remove('slide-out');
        }, 300); // 与动画持续时间相同
    }
    
    // 为更多选项按钮添加点击事件监听器
    const moreOptionsBtn = document.getElementById('more-options-btn');
    const moreOptionsModal = document.getElementById('more-options-modal');
    const moreOptionsClose = moreOptionsModal?.querySelector('.close');
    
    if (moreOptionsBtn && moreOptionsModal && moreOptionsClose) {
        // 显示弹窗
        moreOptionsBtn.addEventListener('click', function() {
            moreOptionsModal.style.display = 'block';
        });
        
        // 关闭弹窗
        moreOptionsClose.addEventListener('click', function() {
            closeModal(moreOptionsModal);
        });
        
        // 点击弹窗外部关闭弹窗
        window.addEventListener('click', function(event) {
            if (event.target === moreOptionsModal) {
                closeModal(moreOptionsModal);
            }
        });
        
        // ESC键关闭弹窗
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && moreOptionsModal.style.display === 'block') {
                closeModal(moreOptionsModal);
            }
        });
    }
    
    // 为更新日志按钮添加点击事件监听器
    const updateLogBtn = document.getElementById('update-log-btn');
    const updateLogModal = document.getElementById('update-log-modal');
    const updateLogClose = updateLogModal?.querySelector('.close');
    const updateLogContent = document.getElementById('update-log-content');
    
    if (updateLogBtn && updateLogModal && updateLogClose && updateLogContent) {
        // 显示弹窗
        updateLogBtn.addEventListener('click', function() {
            updateLogModal.style.display = 'block';
            // 加载更新日志内容
            loadUpdateLog();
        });
        
        // 关闭弹窗
        updateLogClose.addEventListener('click', function() {
            closeModal(updateLogModal);
        });
        
        // 点击弹窗外部关闭弹窗
        window.addEventListener('click', function(event) {
            if (event.target === updateLogModal) {
                closeModal(updateLogModal);
            }
        });
        
        // ESC键关闭弹窗
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && updateLogModal.style.display === 'block') {
                closeModal(updateLogModal);
            }
        });
    }
    
    // 为注意事项按钮添加点击事件监听器
    const noticeBtn = document.getElementById('notice-btn');
    const noticeModal = document.getElementById('notice-modal');
    const noticeClose = noticeModal?.querySelector('.close');
    
    if (noticeBtn && noticeModal && noticeClose) {
        // 显示弹窗
        noticeBtn.addEventListener('click', function() {
            noticeModal.style.display = 'block';
        });
        
        // 关闭弹窗
        noticeClose.addEventListener('click', function() {
            closeModal(noticeModal);
        });
        
        // 点击弹窗外部关闭弹窗
        window.addEventListener('click', function(event) {
            if (event.target === noticeModal) {
                closeModal(noticeModal);
            }
        });
        
        // ESC键关闭弹窗
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && noticeModal.style.display === 'block') {
                closeModal(noticeModal);
            }
        });
    }
    
    // 加载更新日志内容
    function loadUpdateLog() {
        if (!updateLogContent) return;
        
        // 显示加载状态
        updateLogContent.innerHTML = '<p class="loading-indicator">加载中...</p>';
        
        // 使用fetch获取Markdown文件内容
        fetch('doc/update-log.md')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.text();
            })
            .then(markdown => {
                // 将Markdown转换为HTML
                const html = convertMarkdownToHtml(markdown);
                updateLogContent.innerHTML = html;
            })
            .catch(error => {
                console.error('加载更新日志失败:', error);
                updateLogContent.innerHTML = '<p class="error-message">加载更新日志失败，请刷新页面重试。</p>';
            });
    }
    
    // Markdown转HTML函数
    function convertMarkdownToHtml(markdown) {
        let html = markdown
            // 转换一级标题 (#) - 应该是h1而不是h3
            .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
            // 转换二级标题 (##) - 应该是h2而不是h4
            .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
            // 转换三级标题 (###)
            .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
            // 转换无序列表 (-)，先包装整个列表
            .replace(/(?:^-\s+(.+)(?:\n|$))+/gm, match => {
                const items = match.split('\n').filter(line => line.trim());
                const listItems = items.map(item => 
                    item.replace(/^-\s+(.+)$/, '<li>$1</li>')
                ).join('');
                return `<ul>${listItems}</ul>`;
            })
            // 转换加粗文本 (**text**)
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            // 处理单独的#号，转换为换行
            .replace(/^#$/gm, '<br>')
            // 处理段落 - 将连续的非空行作为段落
            .replace(/(.+?)(?:\r?\n|$)/g, '<p>$1</p>')
            // 清理空的段落
            .replace(/<p><\/p>/g, '')
            // 处理未转换的#号，转换为空格（放在最后避免影响前面的规则）
            .replace(/(?<!<[^>]*)#(?!\s)/g, ' ');
        
        return html;
    }
});

// 加载并显示前置弹窗
function loadPrePopup() {
    // 获取弹窗元素
    const popup = document.getElementById('prePopup');
    const popupTitle = document.getElementById('prePopupTitle');
    const popupContent = document.getElementById('prePopupContent');
    const popupButton = document.getElementById('prePopupButton');
    
    // 检查是否存在弹窗元素
    if (!popup || !popupTitle || !popupContent || !popupButton) {
        console.error('无法找到弹窗元素');
        return;
    }
    
    // 检查用户是否已经关闭过弹窗（使用localStorage存储）
    const hasClosedPopup = localStorage.getItem('prePopupClosed');
    const storedPopupTime = localStorage.getItem('prePopupTime');
    
    // 从JSON文件加载弹窗配置
    fetch('data/popup-config.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('无法加载弹窗配置');
            }
            return response.json();
        })
        .then(config => {
            // 检查是否需要显示弹窗
            if (!config.showPopup) {
                return;
            }
            
            // 检查用户是否已经关闭过该版本的弹窗
            if (hasClosedPopup && storedPopupTime === config.time) {
                return;
            }
                // 设置弹窗内容
                popupTitle.textContent = config.title || '通知';
                // 使用innerHTML和<br>标签来正确显示换行
                popupContent.innerHTML = '';
                if (config.time) {
                    popupContent.innerHTML += config.time + '<br><br>';
                }
                popupContent.innerHTML += config.content || '';
                popupButton.textContent = config.buttonText || '确定';
                
                // 显示弹窗，添加动画效果
                setTimeout(() => {
                    popup.classList.add('show');
                }, 100);
                
                // 添加按钮点击事件
                popupButton.addEventListener('click', function() {
                    // 隐藏弹窗，添加动画效果
                    popup.classList.remove('show');
                    
                    // 动画结束后完全隐藏
                    setTimeout(() => {
                        popup.style.display = 'none';
                    }, config.animationDuration || 300);
                    
                    // 记录用户已经关闭过弹窗
                    localStorage.setItem('prePopupClosed', 'true');
                    // 记录弹窗显示时间
                    localStorage.setItem('prePopupTime', config.time || '');
                });
        })
        .catch(error => {
            console.error('加载弹窗配置时出错:', error);
        });
}

// 本地存储相关函数
async function getCompletedTasks() {
    if (currentUser) {
        const { data, error } = await supabase
            .from('completed_tasks')
            .select('tasks')
            .eq('user_id', currentUser.id)
            .single();
        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
            console.error('从Supabase获取数据失败:', error);
            return {};
        }
        return data ? data.tasks : {};
    } else {
        const stored = localStorage.getItem('completedTasks');
        return stored ? JSON.parse(stored) : {};
    }
}

// 保存已完成任务
async function saveCompletedTask(taskId, isCompleted) {
    // 清除缓存，确保下次获取最新数据
    clearFilterCache();
    
    const completedTasks = await getCompletedTasks();
    completedTasks[taskId] = isCompleted;
    
    if (currentUser) {
        const { error } = await supabase
            .from('completed_tasks')
            .upsert({ user_id: currentUser.id, tasks: completedTasks }, { onConflict: 'user_id' });
        if (error) {
            console.error('保存数据到Supabase失败:', error);
        }
    } else {
        localStorage.setItem('completedTasks', JSON.stringify(completedTasks));
    }
    updateIncompleteCount();
}

// 从Supabase同步数据到本地
async function syncDataFromSupabase() {
    if (currentUser) {
        const cloudTasks = await getCompletedTasks();
        const localTasks = JSON.parse(localStorage.getItem('completedTasks') || '{}');
        
        // 合并数据：云端数据优先，但保留本地新增的
        const mergedTasks = { ...localTasks, ...cloudTasks };
        
        // 更新本地存储
        localStorage.setItem('completedTasks', JSON.stringify(mergedTasks));
        
        // 将合并后的数据上传回Supabase
        const { error } = await supabase
            .from('completed_tasks')
            .upsert({ user_id: currentUser.id, tasks: mergedTasks }, { onConflict: 'user_id' });
        if (error) {
            console.error('合并数据并上传到Supabase失败:', error);
        }
        
        // 清除缓存，确保下次渲染使用最新数据
        clearFilterCache();
        
        renderView();
    }
}

// 文档片段用于批量DOM操作
function createDocumentFragment() {
    return document.createDocumentFragment();
}

// 根据设备宽度渲染对应视图
async function renderView(filteredData = null) {
    const isMobile = window.innerWidth <= 768;
    const hasFilteredData = filteredData !== null && filteredData !== undefined;
    
    // 获取最新的完成任务数据
    const now = Date.now();
    let completedTasks;
    if (now - cacheTimestamp < CACHE_DURATION && completedTasksCache) {
        completedTasks = completedTasksCache;
    } else {
        completedTasks = await getCompletedTasks();
        completedTasksCache = completedTasks;
        cacheTimestamp = now;
    }

    // 为主要内容区域创建或更新视图
    if (isMobile) {
        if (hasFilteredData) {
            renderCards(filteredData, completedTasks);
        } else {
            // 优先使用缓存的筛选结果
            renderCards(filteredDataCache || null, completedTasks);
        }
    } else {
        if (hasFilteredData) {
            renderTable(filteredData, completedTasks);
        } else {
            // 优先使用缓存的筛选结果
            renderTable(filteredDataCache || null, completedTasks);
        }
    }
}



// 计算未完成任务数量并更新显示
async function updateIncompleteCount() {
    const completedTasks = await getCompletedTasks();
    const incompleteCount = characterData.filter(item => !completedTasks[item.id]).length;
    const incompleteCountElement = document.getElementById('incomplete-count');
    if (incompleteCountElement) {
        incompleteCountElement.textContent = incompleteCount;
    }
}

// 更新总数和当前显示数量
function updateTaskCounts(filteredData = null) {
    // 更新总数
    const totalCountElement = document.getElementById('total-count');
    if (totalCountElement) {
        totalCountElement.textContent = characterData.length;
    }
    
    // 更新当前显示数量
    const currentCountElement = document.getElementById('current-count');
    if (currentCountElement) {
        // 如果传入了已筛选的数据，直接使用其长度作为当前显示数量
        // 因为applyFilters已经处理了所有筛选条件
        const currentCount = filteredData ? filteredData.length : characterData.length;
        
        currentCountElement.textContent = currentCount;
    }
}

// 渲染主表格
async function renderTable(filteredData = null, completedTasks = null) {
    const tableBody = document.getElementById('table-body');
    tableBody.innerHTML = '';
    
    // 确保data是数组，如果不是则使用characterData
    const data = Array.isArray(filteredData) ? filteredData : characterData;
    const currentCompletedTasks = completedTasks || await getCompletedTasks();
    const showOnlyIncomplete = document.getElementById('show-completed')?.checked || false;
    
    // 更新未完成任务数量显示
    await updateIncompleteCount();
    
    // 更新总数和当前显示数量
    updateTaskCounts(filteredData);
    
    // 使用文档片段批量添加行，减少重排重绘
    const fragment = createDocumentFragment();
    
    data.forEach(item => {
        // 应用仅显示未完成的筛选
        if (showOnlyIncomplete && currentCompletedTasks[item.id]) {
            return;
        }
        
        const row = document.createElement('tr');
        
        // 根据地区添加对应的样式类
        let regionClass = '';
        if (item.location.includes('蒙德')) regionClass = 'region-mondstadt';
        else if (item.location.includes('璃月')) regionClass = 'region-liyue';
        else if (item.location.includes('稻妻')) regionClass = 'region-inazuma';
        else if (item.location.includes('须弥')) regionClass = 'region-sumeru';
        else if (item.location.includes('枫丹')) regionClass = 'region-fontaine';
        else if (item.location.includes('纳塔')) regionClass = 'region-natlan';
        else if (item.location.includes('挪德')) regionClass = 'region-nordkala';
        
        row.className = regionClass;
        
        // 如果任务已完成，添加完成样式
        if (currentCompletedTasks[item.id]) {
            row.classList.add('completed-task');
        }
        
        // 完成状态复选框
        const checkboxCell = document.createElement('td');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.checked = currentCompletedTasks[item.id] || false;
        checkbox.addEventListener('change', async function() {
            await saveCompletedTask(item.id, this.checked);
            if (this.checked) {
                row.classList.add('completed-task');
            } else {
                row.classList.remove('completed-task');
            }
            // 如果启用了仅显示未完成，需要重新渲染表格
            if (document.getElementById('show-completed')?.checked) {
                await renderTable(filteredData, await getCompletedTasks());
            }
        });
        checkboxCell.appendChild(checkbox);
        row.appendChild(checkboxCell);
        
        // 总计数
        const idCell = document.createElement('td');
        idCell.textContent = item.id;
        row.appendChild(idCell);
        
        // 角色
        const characterCell = document.createElement('td');
        characterCell.textContent = item.character;
        row.appendChild(characterCell);
        
        // 版本
        const versionCell = document.createElement('td');
        versionCell.textContent = item.version;
        row.appendChild(versionCell);
        
        // 游逸旅闻
        const travelCell = document.createElement('td');
        const travelSpan = document.createElement('span');
        travelSpan.textContent = item.travelName;
        if (item.isHidden) {
            travelSpan.className = 'hidden-travel';
        }
        travelCell.appendChild(travelSpan);
        row.appendChild(travelCell);
        
        // 地点
        const locationCell = document.createElement('td');
        locationCell.textContent = item.location;
        row.appendChild(locationCell);
        
        // 隐藏触发条件
        const conditionCell = document.createElement('td');
        conditionCell.textContent = item.hiddenCondition || '-';
        row.appendChild(conditionCell);
        
        // 额外出场角色
        const extraCell = document.createElement('td');
        extraCell.textContent = item.extraCharacter || '-';
        row.appendChild(extraCell);
        
        // 描述
        const descCell = document.createElement('td');
        descCell.textContent = item.description;
        row.appendChild(descCell);
        
        // 添加到文档片段而不是直接添加到DOM
        fragment.appendChild(row);
    });
    
    // 一次性将所有行添加到DOM，减少重排重绘
    tableBody.appendChild(fragment);
}

// 渲染主表格的卡片视图
async function renderCards(filteredData = null, completedTasks = null) {
    const tableContainer = document.querySelector('.table-container');
    
    // 检查是否已有卡片容器，如果没有则创建
    let cardContainer = document.querySelector('.card-container');
    if (!cardContainer) {
        cardContainer = document.createElement('div');
        cardContainer.className = 'card-container';
        tableContainer.appendChild(cardContainer);
    } else {
        cardContainer.innerHTML = '';
    }
    
    const data = Array.isArray(filteredData) ? filteredData : characterData;
    const currentCompletedTasks = completedTasks || await getCompletedTasks();
    const showOnlyIncomplete = document.getElementById('show-completed')?.checked || false;
    
    // 更新未完成任务数量显示
    await updateIncompleteCount();
    
    // 更新总数和当前显示数量
    updateTaskCounts(filteredData);
    
    // 使用文档片段批量添加卡片，减少重排重绘
    const fragment = createDocumentFragment();
    
    data.forEach(item => {
        // 应用仅显示未完成的筛选
        if (showOnlyIncomplete && currentCompletedTasks[item.id]) {
            return;
        }
        
        const card = document.createElement('div');
        card.className = 'character-card';
        
        // 根据地区添加对应的样式类
        if (item.location.includes('蒙德')) card.classList.add('card-mondstadt');
        else if (item.location.includes('璃月')) card.classList.add('card-liyue');
        else if (item.location.includes('稻妻')) card.classList.add('card-inazuma');
        else if (item.location.includes('须弥')) card.classList.add('card-sumeru');
        else if (item.location.includes('枫丹')) card.classList.add('card-fontaine');
        else if (item.location.includes('纳塔')) card.classList.add('card-natlan');
        else if (item.location.includes('挪德')) card.classList.add('card-nordkala');
        
        // 如果任务已完成，添加完成样式
        if (currentCompletedTasks[item.id]) {
            card.classList.add('completed-task');
        }
        
        // 卡片标题
        const header = document.createElement('div');
        header.className = 'card-header';
        
        const characterName = document.createElement('div');
        characterName.className = 'card-character';
        characterName.textContent = item.character;
        
        const versionTag = document.createElement('div');
        versionTag.className = 'card-version';
        versionTag.textContent = item.version;
        
        // 完成状态复选框
        const checkboxContainer = document.createElement('div');
        checkboxContainer.className = 'card-checkbox-container';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.checked = currentCompletedTasks[item.id] || false;
        checkbox.addEventListener('change', async function() {
            await saveCompletedTask(item.id, this.checked);
            if (this.checked) {
                card.classList.add('completed-task');
            } else {
                card.classList.remove('completed-task');
            }
            // 如果启用了仅显示未完成，需要重新渲染卡片
            if (document.getElementById('show-completed')?.checked) {
                await renderCards(filteredData, await getCompletedTasks());
            }
        });
        checkboxContainer.appendChild(checkbox);
        
        header.appendChild(characterName);
        header.appendChild(versionTag);
        header.appendChild(checkboxContainer);
        
        // 卡片内容
        const content = document.createElement('div');
        content.className = 'card-content';
        
        // 游逸旅闻和地点组合显示
        const travelLocationItem = document.createElement('div');
        travelLocationItem.className = 'card-item travel-location';
        
        const travelLocationValue = document.createElement('span');
        travelLocationValue.className = 'card-value';
        if (item.isHidden) travelLocationValue.classList.add('hidden-travel');
        travelLocationValue.textContent = `${item.travelName} ${item.location}`;
        
        travelLocationItem.appendChild(travelLocationValue);
        
        // 隐藏触发条件 - 只有当有内容时才显示
        const conditionItem = document.createElement('div');
        conditionItem.className = 'card-item condition-item';
        
        const conditionValue = document.createElement('span');
        conditionValue.className = 'card-value';
        conditionValue.innerHTML = `<strong>隐藏触发条件：</strong>${item.hiddenCondition || '-'}`;
        
        conditionItem.appendChild(conditionValue);
        
        // 额外出场角色 - 只有当有内容时才显示
        const extraItem = document.createElement('div');
        extraItem.className = 'card-item extra-item';
        
        const extraValue = document.createElement('span');
        extraValue.className = 'card-value';
        extraValue.innerHTML = `<strong>额外出场角色：</strong>${item.extraCharacter || '-'}`;
        
        extraItem.appendChild(extraValue);
        
        // 描述 - 限制一行，超出部分显示省略号，提供显示全部按钮
        const descItem = document.createElement('div');
        descItem.className = 'card-item description-item';
        
        const descContainer = document.createElement('div');
        descContainer.className = 'description-container';
        
        const descValue = document.createElement('span');
        descValue.className = 'card-value description-text';
        descValue.textContent = item.description;
        
        // 检查描述是否需要截断显示
        if (item.description.length > 12) {
            descValue.classList.add('truncated');
            
            const showMoreBtn = document.createElement('button');
            showMoreBtn.className = 'show-more-btn';
            showMoreBtn.textContent = '展开';
            
            showMoreBtn.addEventListener('click', function() {
                descValue.classList.toggle('truncated');
                this.textContent = descValue.classList.contains('truncated') ? '展开' : '收起';
            });
            
            // 将按钮和文本都添加到一个内联容器中，使按钮显示在文本后面
            const inlineContainer = document.createElement('span');
            inlineContainer.appendChild(descValue);
            inlineContainer.appendChild(showMoreBtn);
            descContainer.appendChild(inlineContainer);
        } else {
            descContainer.appendChild(descValue);
        }
        
        descItem.appendChild(descContainer);
        
        // 组合卡片内容
        content.appendChild(travelLocationItem);
        
        // 只有当隐藏触发条件有内容时才添加
        if (item.hiddenCondition && item.hiddenCondition !== '-') {
            content.appendChild(conditionItem);
        }
        
        // 只有当额外出场角色有内容时才添加
        if (item.extraCharacter && item.extraCharacter !== '-') {
            content.appendChild(extraItem);
        }
        
        content.appendChild(descItem);
        
        // 组合卡片
        card.appendChild(header);
        card.appendChild(content);
        
        // 添加到文档片段而不是直接添加到DOM
        fragment.appendChild(card);
    });
    
    // 一次性将所有卡片添加到DOM，减少重排重绘
    cardContainer.appendChild(fragment);
}

// 添加事件监听器
function addEventListeners() {
    // 搜索功能
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        // 添加防抖处理，避免频繁触发筛选
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(async () => {
                await filterData();
            }, 300); // 300毫秒延迟
        });
    }

    // 筛选功能
    const regionFilter = document.getElementById('region-filter');
    if (regionFilter) {
        regionFilter.addEventListener('change', async () => {
            await filterData();
        });
    }
    
    const versionFilter = document.getElementById('version-filter');
    if (versionFilter) {
        versionFilter.addEventListener('change', async () => {
            await filterData();
        });
    }
    
    const showCompleted = document.getElementById('show-completed');
    if (showCompleted) {
        showCompleted.addEventListener('change', async () => {
            await filterData();
        });
    }

    // 清除筛选按钮
    const clearFilter = document.getElementById('clear-filter');
    if (clearFilter) {
        clearFilter.addEventListener('click', async () => {
            // 在回调函数内部重新获取DOM元素，避免作用域问题
            const searchInput = document.getElementById('search-input');
            const regionFilter = document.getElementById('region-filter');
            const versionFilter = document.getElementById('version-filter');
            const showCompleted = document.getElementById('show-completed');
            
            if (regionFilter) {
                regionFilter.value = 'all';
                initCustomSelectDisplay(regionFilter);
            }
            if (versionFilter) {
                versionFilter.value = 'all';
                initCustomSelectDisplay(versionFilter);
            }
            if (searchInput) searchInput.value = '';
            if (showCompleted) showCompleted.checked = false;
            await filterData();
        });
    }

    // 认证弹窗相关事件监听器
    if (authModalTrigger) {
        authModalTrigger.addEventListener('click', openAuthModal);
    }

    if (authModalClose) {
        authModalClose.addEventListener('click', closeAuthModal);
    }

    if (authTabLogin) {
        authTabLogin.addEventListener('click', showLoginTab);
    }

    if (authTabSignup) {
        authTabSignup.addEventListener('click', showSignupTab);
    }

    // 点击弹窗外部关闭弹窗
    window.addEventListener('click', function(event) {
        if (event.target === authModal) {
            closeAuthModal();
        }
    });
}

// 应用筛选条件
function applyFilters() {
    // 为了向后兼容保留此函数，但内部调用新的filterData函数
    filterData();
}

// 筛选结果缓存
let filteredDataCache = null;
let completedTasksCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 1000; // 缓存1秒

// 筛选和排序数据
async function filterData() {
    // 获取当前时间戳
    const now = Date.now();
    
    // 检查缓存是否有效
    let completedTasks;
    if (now - cacheTimestamp < CACHE_DURATION && completedTasksCache) {
        completedTasks = completedTasksCache;
    } else {
        completedTasks = await getCompletedTasks();
        completedTasksCache = completedTasks;
        cacheTimestamp = now;
    }
    
    let filtered = [...characterData];

    // 搜索
    const searchInput = document.getElementById('search-input');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    if (searchTerm) {
        filtered = filtered.filter(item => 
            item.character.toLowerCase().includes(searchTerm) ||
            item.travelName.toLowerCase().includes(searchTerm) ||
            item.location.toLowerCase().includes(searchTerm) ||
            item.description.toLowerCase().includes(searchTerm)
        );
    }

    // 筛选
    const versionFilter = document.getElementById('version-filter');
    const filterVersion = versionFilter ? versionFilter.value : 'all';
    if (filterVersion !== 'all') {
        filtered = filtered.filter(item => item.version === filterVersion);
    }

    const regionFilter = document.getElementById('region-filter');
    const filterLocation = regionFilter ? regionFilter.value : 'all';
    if (filterLocation !== 'all') {
        filtered = filtered.filter(item => item.location.includes(filterLocation));
    }

    const showCompleted = document.getElementById('show-completed');
    const showOnlyIncomplete = showCompleted ? showCompleted.checked : false;
    if (showOnlyIncomplete) {
        filtered = filtered.filter(item => !completedTasks[item.id]);
    }
    
    // 缓存筛选结果
    filteredDataCache = filtered;
    
    await renderView(filtered);
}

// 清除缓存（在数据更新时调用）
function clearFilterCache() {
    filteredDataCache = null;
    completedTasksCache = null;
    cacheTimestamp = 0;
}

// 初始化回到顶部按钮
function initScrollTopButton() {
    const scrollTopButton = document.querySelector('.scroll-top');
    
    if (scrollTopButton) {
        window.addEventListener('scroll', function() {
            if (window.pageYOffset > 300) {
                scrollTopButton.classList.add('visible');
            } else {
                scrollTopButton.classList.remove('visible');
            }
        });
        
        scrollTopButton.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
}


    
    // 初始化回到顶部按钮
    initScrollTopButton();
    
    // 窗口大小变化时重新渲染视图
    window.addEventListener('resize', function() {
        renderView();
    });
    
    // 关闭弹窗函数 - 提取为共享函数，供所有弹窗使用
    function closeModal(modal) {
        const modalContent = modal.querySelector('.modal-content');
        // 添加关闭动画类
        modal.classList.add('fade-out');
        modalContent.classList.add('slide-out');
        
        // 动画结束后隐藏弹窗
        setTimeout(() => {
            modal.style.display = 'none';
            // 移除动画类，以便下次打开时重新触发动画
            modal.classList.remove('fade-out');
            modalContent.classList.remove('slide-out');
        }, 300); // 与动画持续时间相同
    }
    
    // 为更新日志按钮添加点击事件监听器
    const updateLogBtn = document.getElementById('update-log-btn');
    const updateLogModal = document.getElementById('update-log-modal');
    const updateLogClose = updateLogModal?.querySelector('.close');
    const updateLogContent = document.getElementById('update-log-content');
    
    if (updateLogBtn && updateLogModal && updateLogClose && updateLogContent) {
        // 显示弹窗
        updateLogBtn.addEventListener('click', function() {
            updateLogModal.style.display = 'block';
            // 加载更新日志内容
            loadUpdateLog();
        });
        
        // 关闭弹窗
        updateLogClose.addEventListener('click', function() {
            closeModal(updateLogModal);
        });
        
        // 点击弹窗外部关闭弹窗
        window.addEventListener('click', function(event) {
            if (event.target === updateLogModal) {
                closeModal(updateLogModal);
            }
        });
        
        // ESC键关闭弹窗
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && updateLogModal.style.display === 'block') {
                closeModal(updateLogModal);
            }
        });
    }
    
    // 为注意事项按钮添加点击事件监听器
    const noticeBtn = document.getElementById('notice-btn');
    const noticeModal = document.getElementById('notice-modal');
    const noticeClose = noticeModal?.querySelector('.close');
    
    if (noticeBtn && noticeModal && noticeClose) {
        // 显示弹窗
        noticeBtn.addEventListener('click', function() {
            noticeModal.style.display = 'block';
        });
        
        // 关闭弹窗
        noticeClose.addEventListener('click', function() {
            closeModal(noticeModal);
        });
        
        // 点击弹窗外部关闭弹窗
        window.addEventListener('click', function(event) {
            if (event.target === noticeModal) {
                closeModal(noticeModal);
            }
        });
        
        // ESC键关闭弹窗
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && noticeModal.style.display === 'block') {
                closeModal(noticeModal);
            }
        });
    }
    
    // 加载更新日志内容
    function loadUpdateLog() {
        if (!updateLogContent) return;
        
        // 显示加载状态
        updateLogContent.innerHTML = '<p class="loading-indicator">加载中...</p>';
        
        // 使用fetch获取Markdown文件内容
        fetch('doc/update-log.md')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.text();
            })
            .then(markdown => {
                // 将Markdown转换为HTML
                const html = convertMarkdownToHtml(markdown);
                updateLogContent.innerHTML = html;
            })
            .catch(error => {
                console.error('加载更新日志失败:', error);
                updateLogContent.innerHTML = '<p class="error-message">加载更新日志失败，请刷新页面重试。</p>';
            });
    }
    
    // Markdown转HTML函数
    function convertMarkdownToHtml(markdown) {
    let html = markdown
        // 转换一级标题 (#) - 应该是h1而不是h3
        .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
        // 转换二级标题 (##) - 应该是h2而不是h4
        .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
        // 转换三级标题 (###)
        .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
        // 转换无序列表 (-)，先包装整个列表
        .replace(/(?:^-\s+(.+)(?:\n|$))+/gm, match => {
            const items = match.split('\n').filter(line => line.trim());
            const listItems = items.map(item => 
                item.replace(/^-\s+(.+)$/, '<li>$1</li>')
            ).join('');
            return `<ul>${listItems}</ul>`;
        })
        // 转换加粗文本 (**text**)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // 处理单独的#号，转换为换行
        .replace(/^#$/gm, '<br>')
        // 处理段落 - 将连续的非空行作为段落
        .replace(/(.+?)(?:\r?\n|$)/g, '<p>$1</p>')
        // 清理空的段落
        .replace(/<p><\/p>/g, '')
        // 处理未转换的#号，转换为空格（放在最后避免影响前面的规则）
        .replace(/(?<!<[^>]*)#(?!\s)/g, ' ');

    return html;
}