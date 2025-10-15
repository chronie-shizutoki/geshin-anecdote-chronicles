
import { characterData } from './data/data-zh-cn.js';
import { initCustomSelectDisplay } from './components/select.js';
import { supabase } from './supabase.js';

// 认证相关的DOM元素
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const authSignupBtn = document.getElementById('auth-signup');
const authSigninBtn = document.getElementById('auth-signin');
const authSignoutBtn = document.getElementById('auth-signout');
const authStatus = document.getElementById('auth-status');

let currentUser = null;

// Supabase 认证状态监听
supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        currentUser = session.user;
        authStatus.textContent = `已登录: ${currentUser.email}`;
        authSignoutBtn.style.display = 'block';
        authEmail.style.display = 'none';
        authPassword.style.display = 'none';
        authSignupBtn.style.display = 'none';
        authSigninBtn.style.display = 'none';
        // 登录成功后，清空输入框
        authEmail.value = '';
        authPassword.value = '';
        // 用户登录后，尝试从云端同步数据
        syncDataFromSupabase();
    } else {
        currentUser = null;
        authStatus.textContent = '未登录';
        authSignoutBtn.style.display = 'none';
        authEmail.style.display = 'block';
        authPassword.style.display = 'block';
        authSignupBtn.style.display = 'block';
        authSigninBtn.style.display = 'block';
        // 登出后，清空输入框
        authEmail.value = '';
        authPassword.value = '';
        // 用户登出后，清空本地数据或切换回本地存储
        localStorage.removeItem('completedTasks');
        renderView();
    }
    updateIncompleteCount();
    updateTaskCounts();
});

// 注册功能
authSignupBtn.addEventListener('click', async () => {
    const email = authEmail.value;
    const password = authPassword.value;
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
    });
    if (error) {
        authStatus.textContent = `注册失败: ${error.message}`;
        console.error('注册失败:', error);
    } else if (data.user) {
        authStatus.textContent = '注册成功，请检查您的邮箱进行验证。';
        // 注册成功后清空密码，但保留邮箱
        authPassword.value = '';
    } else {
        authStatus.textContent = '注册成功，但未返回用户数据。';
        // 注册成功后清空密码，但保留邮箱
        authPassword.value = '';
    }
});

// 登录功能
authSigninBtn.addEventListener('click', async () => {
    const email = authEmail.value;
    const password = authPassword.value;
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });
    if (error) {
        authStatus.textContent = `登录失败: ${error.message}`;
        console.error('登录失败:', error);
    } else if (data.user) {
        authStatus.textContent = `登录成功: ${data.user.email}`;
        // 登录成功后清空密码
        authPassword.value = '';
    } else {
        authStatus.textContent = '登录成功，但未返回用户数据。';
        // 登录成功后清空密码
        authPassword.value = '';
    }
});

// 登出功能
authSignoutBtn.addEventListener('click', async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        authStatus.textContent = `登出失败: ${error.message}`;
        console.error('登出失败:', error);
    } else {
        authStatus.textContent = '已登出';
        // 登出后清空输入框
        authEmail.value = '';
        authPassword.value = '';
    }
});

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
    event.target.value = '';
};

// DOM 加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    loadPrePopup();
    renderView();
    addEventListeners();
    initScrollTopButton();
    window.addEventListener('resize', renderView);
    document.getElementById('export-data')?.addEventListener('click', exportData);
    document.getElementById('import-data')?.addEventListener('change', importData);
    updateIncompleteCount();
    updateTaskCounts();

    // 初始加载时检查认证状态并更新UI
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            currentUser = session.user;
            authStatus.textContent = `已登录: ${currentUser.email}`;
            authSignoutBtn.style.display = 'block';
            authEmail.style.display = 'none';
            authPassword.style.display = 'none';
            authSignupBtn.style.display = 'none';
            authSigninBtn.style.display = 'none';
            syncDataFromSupabase();
        } else {
            currentUser = null;
            authStatus.textContent = '未登录';
            authSignoutBtn.style.display = 'none';
            authEmail.style.display = 'block';
            authPassword.style.display = 'block';
            authSignupBtn.style.display = 'block';
            authSigninBtn.style.display = 'block';
        }
    });
});

// 加载并显示前置弹窗
function loadPrePopup() {
    const popup = document.getElementById('prePopup');
    const popupTitle = document.getElementById('prePopupTitle');
    const popupContent = document.getElementById('prePopupContent');
    const popupButton = document.getElementById('prePopupButton');
    
    if (!popup || !popupTitle || !popupContent || !popupButton) {
        console.error('无法找到弹窗元素');
        return;
    }
    
    const hasClosedPopup = localStorage.getItem('prePopupClosed');
    const storedPopupTime = localStorage.getItem('prePopupTime');
    
    fetch('data/popup-config.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('无法加载弹窗配置');
            }
            return response.json();
        })
        .then(config => {
            if (!config.showPopup) {
                return;
            }
            
            if (hasClosedPopup && storedPopupTime === config.time) {
                return;
            }
                popupTitle.textContent = config.title || '通知';
                popupContent.innerHTML = '';
                if (config.time) {
                    popupContent.innerHTML += config.time + '<br><br>';
                }
                popupContent.innerHTML += config.content || '';
                popupButton.textContent = config.buttonText || '确定';
                
                setTimeout(() => {
                    popup.classList.add('show');
                }, 100);
                
                popupButton.addEventListener('click', function() {
                    popup.classList.remove('show');
                    setTimeout(() => {
                        popup.style.display = 'none';
                    }, config.animationDuration || 300);
                    localStorage.setItem('prePopupClosed', 'true');
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
        renderView();
    }
}

// 根据设备宽度渲染对应视图
async function renderView(filteredData = null) {
    const isMobile = window.innerWidth <= 768;
    const hasFilteredData = filteredData !== null && filteredData !== undefined;
    
    // 获取最新的完成任务数据
    const completedTasks = await getCompletedTasks();

    // 为主要内容区域创建或更新视图
    if (isMobile) {
        if (hasFilteredData) {
            renderCards(filteredData, completedTasks);
        } else {
            renderCards(null, completedTasks);
        }
    } else {
        if (hasFilteredData) {
            renderTable(filteredData, completedTasks);
        } else {
            renderTable(null, completedTasks);
        }
    }
}

// 在 DOM 加载完成后为新版本按钮添加点击事件监听器
document.addEventListener('DOMContentLoaded', function() {
    const newVersionBtn = document.getElementById('new-version-btn');
    if (newVersionBtn) {
        newVersionBtn.addEventListener('click', function() {
            window.open('new-version.html', '_self');
        });
    }
});

// 在 DOM 加载完成后为反馈按钮添加点击事件监听器
document.addEventListener('DOMContentLoaded', function() {
    const feedbackBtn = document.getElementById('feedback-btn');
    if (feedbackBtn) {
        feedbackBtn.addEventListener('click', function() {
            window.open('https://wj.qq.com/s2/24219207/e16c/', '_blank');
        });
    }
    
    // 初始化自定义选择框
    initCustomSelectDisplay();
});

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
    const totalCountElement = document.getElementById('total-count');
    if (totalCountElement) {
        totalCountElement.textContent = characterData.length;
    }
    
    const currentCountElement = document.getElementById('current-count');
    if (currentCountElement) {
        const currentCount = filteredData ? filteredData.length : characterData.length;
        currentCountElement.textContent = currentCount;
    }
}

// 渲染主表格
async function renderTable(filteredData = null, completedTasks = null) {
    const tableBody = document.getElementById('table-body');
    tableBody.innerHTML = '';
    
    const data = filteredData || characterData;
    const currentCompletedTasks = completedTasks || await getCompletedTasks();
    const showOnlyIncomplete = document.getElementById('show-completed')?.checked || false;
    
    updateIncompleteCount();
    updateTaskCounts(filteredData);
    data.forEach(item => {
        if (showOnlyIncomplete && currentCompletedTasks[item.id]) {
            return;
        }
        
        const row = document.createElement('tr');
        
        let regionClass = '';
        if (item.location.includes('蒙德')) regionClass = 'region-mondstadt';
        else if (item.location.includes('璃月')) regionClass = 'region-liyue';
        else if (item.location.includes('稻妻')) regionClass = 'region-inazuma';
        else if (item.location.includes('须弥')) regionClass = 'region-sumeru';
        else if (item.location.includes('枫丹')) regionClass = 'region-fontaine';
        else if (item.location.includes('纳塔')) regionClass = 'region-natlan';
        else if (item.location.includes('挪德')) regionClass = 'region-nordkala';
        
        row.className = regionClass;
        
        if (currentCompletedTasks[item.id]) {
            row.classList.add('completed-task');
        }
        
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
            if (document.getElementById('show-completed')?.checked) {
                renderTable(filteredData, await getCompletedTasks());
            }
        });
        checkboxCell.appendChild(checkbox);
        row.appendChild(checkboxCell);
        
        const idCell = document.createElement('td');
        idCell.textContent = item.id;
        row.appendChild(idCell);
        
        const characterCell = document.createElement('td');
        characterCell.textContent = item.character;
        row.appendChild(characterCell);
        
        const versionCell = document.createElement('td');
        versionCell.textContent = item.version;
        row.appendChild(versionCell);
        
        const travelCell = document.createElement('td');
        const travelSpan = document.createElement('span');
        travelSpan.textContent = item.travelName;
        if (item.isHidden) {
            travelSpan.className = 'hidden-travel';
        }
        travelCell.appendChild(travelSpan);
        row.appendChild(travelCell);
        
        const locationCell = document.createElement('td');
        locationCell.textContent = item.location;
        row.appendChild(locationCell);
        
        const conditionCell = document.createElement('td');
        conditionCell.textContent = item.hiddenCondition || '-';
        row.appendChild(conditionCell);
        
        const extraCell = document.createElement('td');
        extraCell.textContent = item.extraCharacter || '-';
        row.appendChild(extraCell);
        
        const descCell = document.createElement('td');
        descCell.textContent = item.description;
        row.appendChild(descCell);
        
        tableBody.appendChild(row);
    });
}

// 渲染主表格的卡片视图
async function renderCards(filteredData = null, completedTasks = null) {
    const tableContainer = document.querySelector('.table-container');
    
    let cardContainer = document.querySelector('.card-container');
    if (!cardContainer) {
        cardContainer = document.createElement('div');
        cardContainer.className = 'card-container';
        tableContainer.appendChild(cardContainer);
    } else {
        cardContainer.innerHTML = '';
    }
    
    const data = filteredData || characterData;
    const currentCompletedTasks = completedTasks || await getCompletedTasks();
    const showOnlyIncomplete = document.getElementById('show-completed')?.checked || false;
    
    updateIncompleteCount();
    updateTaskCounts(filteredData);
    data.forEach(item => {
        if (showOnlyIncomplete && currentCompletedTasks[item.id]) {
            return;
        }
        
        const card = document.createElement('div');
        card.className = 'character-card';
        
        if (item.location.includes('蒙德')) card.classList.add('card-mondstadt');
        else if (item.location.includes('璃月')) card.classList.add('card-liyue');
        else if (item.location.includes('稻妻')) card.classList.add('card-inazuma');
        else if (item.location.includes('须弥')) card.classList.add('card-sumeru');
        else if (item.location.includes('枫丹')) card.classList.add('card-fontaine');
        else if (item.location.includes('纳塔')) card.classList.add('card-natlan');
        else if (item.location.includes('挪德')) card.classList.add('card-nordkala');
        
        if (currentCompletedTasks[item.id]) {
            card.classList.add('completed-task');
        }
        
        const cardHeader = document.createElement('div');
        cardHeader.className = 'card-header';
        
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
            if (document.getElementById('show-completed')?.checked) {
                renderCards(filteredData, await getCompletedTasks());
            }
        });
        cardHeader.appendChild(checkbox);
        
        const cardTitle = document.createElement('h3');
        cardTitle.textContent = item.travelName;
        if (item.isHidden) {
            cardTitle.classList.add('hidden-travel');
        }
        cardHeader.appendChild(cardTitle);
        card.appendChild(cardHeader);
        
        const cardBody = document.createElement('div');
        cardBody.className = 'card-body';
        cardBody.innerHTML = `
            <p><strong>ID:</strong> ${item.id}</p>
            <p><strong>角色:</strong> ${item.character}</p>
            <p><strong>版本:</strong> ${item.version}</p>
            <p><strong>地点:</strong> ${item.location}</p>
            <p><strong>隐藏触发条件:</strong> ${item.hiddenCondition || '-'}</p>
            <p><strong>额外出场角色:</strong> ${item.extraCharacter || '-'}</p>
            <p><strong>描述:</strong> ${item.description}</p>
        `;
        card.appendChild(cardBody);
        
        cardContainer.appendChild(card);
    });
}

// 添加事件监听器
function addEventListeners() {
    // 搜索功能
    document.getElementById('search-input').addEventListener('input', filterData);
    // document.getElementById('search-button').addEventListener('click', filterData); // 页面中没有search-button

    // 筛选功能
    document.getElementById('region-filter').addEventListener('change', filterData);
    document.getElementById('version-filter').addEventListener('change', filterData);
    document.getElementById('show-completed').addEventListener('change', filterData);

    // 排序功能 (如果需要，请确保HTML中有对应的元素)
    // document.getElementById('sort-by').addEventListener('change', filterData);
    // document.getElementById('sort-order').addEventListener('change', filterData);

    // 清除筛选按钮
    document.getElementById('clear-filter').addEventListener('click', () => {
        document.getElementById('region-filter').value = 'all';
        document.getElementById('version-filter').value = 'all';
        document.getElementById('search-input').value = '';
        document.getElementById('show-completed').checked = false;
        filterData();
    });
}

// 筛选和排序数据
async function filterData() {
    let filtered = [...characterData];
    const completedTasks = await getCompletedTasks();

    // 搜索
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(item => 
            item.character.toLowerCase().includes(searchTerm) ||
            item.travelName.toLowerCase().includes(searchTerm) ||
            item.location.toLowerCase().includes(searchTerm) ||
            item.description.toLowerCase().includes(searchTerm)
        );
    }

    // 筛选
    const filterVersion = document.getElementById('version-filter').value;
    if (filterVersion !== 'all') {
        filtered = filtered.filter(item => item.version === filterVersion);
    }

    const filterLocation = document.getElementById('region-filter').value;
    if (filterLocation !== 'all') {
        filtered = filtered.filter(item => item.location.includes(filterLocation));
    }

    const showOnlyIncomplete = document.getElementById('show-completed').checked;
    if (showOnlyIncomplete) {
        filtered = filtered.filter(item => !completedTasks[item.id]);
    }

    // 排序 (如果需要，请确保HTML中有对应的元素)
    // const sortBy = document.getElementById('sort-by')?.value;
    // const sortOrder = document.getElementById('sort-order')?.value;

    // if (sortBy && sortOrder) {
    //     filtered.sort((a, b) => {
    //         let valA, valB;
    //         if (sortBy === 'id') {
    //             valA = parseInt(a.id);
    //             valB = parseInt(b.id);
    //         } else if (sortBy === 'version') {
    //             valA = parseFloat(a.version);
    //             valB = parseFloat(b.version);
    //         } else {
    //             valA = a[sortBy];
    //             valB = b[sortBy];
    //         }

    //         if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    //         if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    //         return 0;
    //     });
    // }

    renderView(filtered);
}

// 滚动到顶部按钮
function initScrollTopButton() {
    const scrollTopButton = document.querySelector('.scroll-top'); // 使用类选择器
    if (scrollTopButton) {
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 200) {
                scrollTopButton.style.display = 'block';
            } else {
                scrollTopButton.style.display = 'none';
            }
        });

        scrollTopButton.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

// 初始化时调用一次，确保显示正确的初始状态
updateIncompleteCount();
updateTaskCounts();

