import { app, shell, BrowserWindow, ipcMain, globalShortcut, screen, session } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import { localDb } from './database'
import { aiService } from './aiService'
import { LocalVectorStore } from './vectorStore'

// 创建向量存储实例
const vectorStore = new LocalVectorStore()

// WORKAROUND: For persistent "Access Denied" cache errors on startup.
// This moves the user data directory to a new location to circumvent
// potential permission issues or antivirus locks on the default directory.
// This must be called before the 'ready' event.
try {
  const newPath = join(app.getPath('userData'), '..', `${app.getName()}-data`)
  app.setPath('userData', newPath)
  console.log(`Switched userData path to: ${newPath}`)
} catch (error) {
  console.error('Failed to set new userData path:', error)
}

const execAsync = promisify(exec)

let mainWindow: BrowserWindow | null = null
let quickWindow: BrowserWindow | null = null
let isCapturingUrl = false // Add a flag to track capture state

interface BrowserInfo {
  success: boolean
  browser: string
  hasBrowser: boolean
  windowTitle: string
  error?: string
}

interface CaptureUrlResult {
  success: boolean
  url?: string
  error?: string
}

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    show: false,
    center: true,
    autoHideMenuBar: true,
    resizable: true,
    maximizable: true,
    fullscreenable: false,
    title: 'Memora',
    titleBarStyle: process.platform === 'darwin' ? 'default' : 'default',
    icon: join(__dirname, '../../resources/icon-L.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      webSecurity: false, // 禁用web安全策略以允许跨域请求
      allowRunningInsecureContent: true, // 允许运行不安全内容
      nodeIntegration: false // 保持安全
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    console.log('Main window shown')
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// 调整 createQuickWindow 函数，确保窗口尺寸一致
function createQuickWindow(): BrowserWindow | null {
  try {
    console.log('Creating quick window...')

    const primaryDisplay = screen.getPrimaryDisplay()
    const { workAreaSize } = primaryDisplay
    const windowWidth = 320
    const windowHeight = 480 // 统一窗口高度

    quickWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      x: workAreaSize.width - windowWidth - 20,
      y: workAreaSize.height - windowHeight - 20,
      show: false,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      backgroundColor: '#fff',
      hasShadow: false,
      icon: join(__dirname, '../../resources/icon.png'),
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: false, // 禁用web安全策略以允许跨域请求
        allowRunningInsecureContent: true // 允许运行不安全内容
      }
    })

    console.log('Quick window created')

    // 设置窗口失去焦点时隐藏
    quickWindow.on('blur', () => {
      console.log('Quick window lost focus')
      if (quickWindow && !quickWindow.webContents.isDevToolsOpened() && !isCapturingUrl) {
        quickWindow.hide()
      }
    })

    // 在窗口级别处理F11事件，阻止全屏但允许彩蛋功能
    quickWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F11') {
        event.preventDefault()
        // 这里可以添加彩蛋功能的代码
        console.log('F11 pressed - Easter egg trigger!')
      }
    })

    quickWindow.on('ready-to-show', () => {
      console.log('Quick window ready to show')
    })

    quickWindow.on('show', () => {
      console.log('Quick window shown')
    })

    quickWindow.on('hide', () => {
      console.log('Quick window hidden')
    })

    quickWindow.on('closed', () => {
      console.log('Quick window closed')
      quickWindow = null
    })

    // 加载快速窗口内容
    const quickUrl =
      is.dev && process.env['ELECTRON_RENDERER_URL']
        ? `${process.env['ELECTRON_RENDERER_URL']}#/quick`
        : `file://${join(__dirname, '../renderer/index.html')}#/quick`

    console.log('Loading quick window URL:', quickUrl)

    quickWindow
      .loadURL(quickUrl)
      .then(() => {
        console.log('Quick window loaded successfully')
      })
      .catch((error) => {
        console.error('Failed to load quick window:', error)
      })

    return quickWindow
  } catch (error) {
    console.error('Error creating quick window:', error)
    return null
  }
}

async function toggleQuickWindow(): Promise<void> {
  try {
    if (quickWindow && quickWindow.isVisible()) {
      quickWindow.hide()
      return
    }

    // 1. Ensure window exists
    if (!quickWindow) {
      createQuickWindow()
      // Wait for the window to be ready to receive messages
      await new Promise<void>((resolve) => {
        const checkWindow = () => {
          if (quickWindow && quickWindow.webContents) {
            resolve()
          } else {
            setTimeout(checkWindow, 100)
          }
        }
        checkWindow()
      })
    }

    if (!quickWindow) {
      console.error('Failed to create or find the quick window.')
      return
    }

    // 2. Show window immediately
    const { workAreaSize } = screen.getPrimaryDisplay()
    const windowWidth = 320
    const windowHeight = 480
    quickWindow.setSize(windowWidth, windowHeight)
    const newX = workAreaSize.width - windowWidth - 20
    const newY = workAreaSize.height - windowHeight - 20
    quickWindow.setPosition(newX, newY)

    quickWindow.show()
    quickWindow.focus()

    // 3. Asynchronously detect browser and send result
    // Wait a bit for the Vue component to mount
    setTimeout(() => {
      // Notify renderer that detection is starting
      if (quickWindow && !quickWindow.isDestroyed()) {
        quickWindow.webContents.send('browser-detection-started')
      }

      // Set a fallback timeout to ensure detection doesn't hang indefinitely
      const detectionTimeout = setTimeout(() => {
        if (quickWindow && !quickWindow.isDestroyed()) {
          quickWindow.webContents.send('browser-detection-result', {
            success: false,
            browser: 'TIMEOUT',
            hasBrowser: false,
            windowTitle: '',
            error: 'Detection timed out'
          })
        }
      }, 5000)

      detectActiveBrowser()
        .then((browserInfo) => {
          clearTimeout(detectionTimeout)
          if (quickWindow && !quickWindow.isDestroyed()) {
            quickWindow.webContents.send('browser-detection-result', browserInfo)
          }
        })
        .catch((error) => {
          clearTimeout(detectionTimeout)
          console.error('Browser detection failed:', error)
          if (quickWindow && !quickWindow.isDestroyed()) {
            quickWindow.webContents.send('browser-detection-result', {
              success: false,
              browser: 'ERROR',
              hasBrowser: false,
              windowTitle: '',
              error: error.message
            })
          }
        })
    }, 500) // Wait 500ms for Vue component to mount
  } catch (error) {
    console.error('Error in toggleQuickWindow:', error)
  }
}

// 检测前台是否有浏览器窗口的函数
async function detectActiveBrowser(): Promise<BrowserInfo> {
  try {
    console.log('Detecting active browser...')

    // Try PowerShell method first
    try {
      // Use app's userData directory for temporary scripts (writable in production)
      const userDataDir = app.getPath('userData')
      const scriptPath = join(userDataDir, 'detect_browser.ps1')

      const psScript = `
# Browser Detection Script
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public class WindowHelper {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);

    [DllImport("user32.dll")]
    public static extern int GetWindowTextLength(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
'@

try {
    $foregroundWindow = [WindowHelper]::GetForegroundWindow()
    $processId = 0
    [WindowHelper]::GetWindowThreadProcessId($foregroundWindow, [ref]$processId)

    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue

    if ($process) {
        $processName = $process.ProcessName.ToLower()
        $browserNames = @("msedge", "chrome", "firefox", "opera", "brave", "vivaldi", "iexplore")

        if ($processName -in $browserNames) {
            $titleLength = [WindowHelper]::GetWindowTextLength($foregroundWindow)
            if ($titleLength -gt 0) {
                $title = New-Object System.Text.StringBuilder($titleLength + 1)
                [WindowHelper]::GetWindowText($foregroundWindow, $title, $title.Capacity)

                Write-Output "SUCCESS:$processName:$($title.ToString())"
            } else {
                Write-Output "SUCCESS:$processName:"
            }
        } else {
            Write-Output "NO_BROWSER:$processName:"
        }
    } else {
        Write-Output "ERROR:No process found"
    }
} catch {
    Write-Output "ERROR:$($_.Exception.Message)"
}
`

      fs.writeFileSync(scriptPath, psScript, 'utf8')

      const { stdout, stderr } = await execAsync(
        `powershell.exe -ExecutionPolicy Bypass -File "${scriptPath}"`,
        {
          encoding: 'utf8',
          timeout: 5000,
          windowsHide: true
        }
      )

      // Clean up temporary file
      try {
        fs.unlinkSync(scriptPath)
      } catch (e) {
        console.warn('Failed to clean up script file:', e)
      }

      if (stderr) {
        console.warn('Browser detection stderr:', stderr)
      }

      const output = stdout.trim()
      console.log('Browser detection output:', output)

      if (output.startsWith('SUCCESS:')) {
        const parts = output.split(':')
        const browser = parts[1] || 'UNKNOWN'
        const windowTitle = parts.slice(2).join(':') || ''

        return {
          success: true,
          browser: browser.toUpperCase(),
          hasBrowser: true,
          windowTitle: windowTitle
        }
      } else if (output.startsWith('NO_BROWSER:')) {
        const parts = output.split(':')
        const processName = parts[1] || 'UNKNOWN'

        return {
          success: true,
          browser: 'NONE',
          hasBrowser: false,
          windowTitle: `Active: ${processName}`
        }
      } else {
        throw new Error(`Unexpected output: ${output}`)
      }
    } catch (psError) {
      console.warn('PowerShell method failed:', psError)

      // Fallback: Check if any browser processes are running
      try {
        const { stdout } = await execAsync(
          'tasklist /FI "IMAGENAME eq msedge.exe" /FI "IMAGENAME eq chrome.exe" /FI "IMAGENAME eq firefox.exe" /NH',
          { timeout: 3000, windowsHide: true }
        )

        if (stdout && stdout.includes('.exe')) {
          return {
            success: true,
            browser: 'DETECTED',
            hasBrowser: true,
            windowTitle: 'Browser process found'
          }
        } else {
          return {
            success: true,
            browser: 'NONE',
            hasBrowser: false,
            windowTitle: 'No browser processes'
          }
        }
      } catch (fallbackError) {
        console.error('Fallback detection failed:', fallbackError)
        throw psError
      }
    }
  } catch (error) {
    console.error('Error detecting browser:', error)
    return {
      success: false,
      browser: 'NONE',
      hasBrowser: false,
      windowTitle: '',
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

// 获取活跃浏览器当前网页链接的函数
async function captureBrowserUrl(): Promise<CaptureUrlResult> {
  try {
    console.log('Attempting to capture browser URL using Win32 API...')

    // This script now finds the foreground browser on its own,
    // so no need to call detectActiveBrowser() here first.
    // Use app's userData directory for temporary scripts (writable in production)
    const userDataDir = app.getPath('userData')
    const scriptPath = join(userDataDir, 'capture_url.ps1')

    // 通用浏览器URL抓取脚本
    const psScript = `
# Universal Browser URL Capture Script
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public class BrowserCapture {
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);

    [DllImport("user32.dll")]
    public static extern int GetWindowTextLength(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
}
'@

# Browser process names to look for
$browserProcesses = @("msedge", "chrome", "firefox", "opera", "brave", "vivaldi", "iexplore")

# Global variables
$browserWindows = @()
$currentForegroundWindow = [BrowserCapture]::GetForegroundWindow()

# Callback function for EnumWindows
$enumCallback = {
    param($hWnd, $lParam)

    if ([BrowserCapture]::IsWindowVisible($hWnd)) {
        $processId = 0
        [BrowserCapture]::GetWindowThreadProcessId($hWnd, [ref]$processId)

        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
        if ($process -and $process.ProcessName.ToLower() -in $browserProcesses) {
            $titleLength = [BrowserCapture]::GetWindowTextLength($hWnd)
            if ($titleLength -gt 0) {
                $title = New-Object System.Text.StringBuilder($titleLength + 1)
                [BrowserCapture]::GetWindowText($hWnd, $title, $title.Capacity)

                $windowInfo = @{
                    Handle = $hWnd
                    Title = $title.ToString()
                    ProcessId = $processId
                    ProcessName = $process.ProcessName.ToLower()
                }
                $script:browserWindows += $windowInfo
            }
        }
    }
    return $true
}

try {
    # Check if any browser is running
    $runningBrowsers = Get-Process -Name $browserProcesses -ErrorAction SilentlyContinue
    if (-not $runningBrowsers) {
        Write-Output "ERROR:No browser processes running"
        exit
    }

    # Enumerate all browser windows
    [BrowserCapture]::EnumWindows($enumCallback, [IntPtr]::Zero)

    if ($browserWindows.Count -eq 0) {
        Write-Output "ERROR:No browser windows found"
        exit
    }

    # Find the best browser window (prefer foreground or first visible)
    $targetWindow = $null
    foreach ($window in $browserWindows) {
        if ($window.Handle -eq $currentForegroundWindow) {
            $targetWindow = $window
            break
        }
    }

    if (-not $targetWindow) {
        # Use the first browser window if no foreground match
        $targetWindow = $browserWindows[0]
    }

    Write-Host "Found browser window: $($targetWindow.ProcessName) - $($targetWindow.Title)" -ForegroundColor Green

    # Bring the target window to foreground
    [BrowserCapture]::SetForegroundWindow($targetWindow.Handle)
    Start-Sleep -Milliseconds 500

    # Backup clipboard
    $originalClipboard = ""
    try {
        $originalClipboard = Get-Clipboard -ErrorAction SilentlyContinue
    } catch {}

    # Clear clipboard
    try {
        Set-Clipboard -Value "" -ErrorAction SilentlyContinue
    } catch {}
    Start-Sleep -Milliseconds 200

    # Send keys to copy URL
    Add-Type -AssemblyName System.Windows.Forms

    # Different key combinations for different browsers
    switch ($targetWindow.ProcessName) {
        "firefox" {
            # Firefox might need different approach
            [System.Windows.Forms.SendKeys]::SendWait("^l")
            Start-Sleep -Milliseconds 600
            [System.Windows.Forms.SendKeys]::SendWait("^c")
            Start-Sleep -Milliseconds 600
        }
        default {
            # Standard approach for Chrome-based browsers (Edge, Chrome, etc.)
            [System.Windows.Forms.SendKeys]::SendWait("^l")
            Start-Sleep -Milliseconds 500
            [System.Windows.Forms.SendKeys]::SendWait("^c")
            Start-Sleep -Milliseconds 500
        }
    }

    # Get URL from clipboard
    $capturedUrl = ""
    try {
        $capturedUrl = Get-Clipboard -ErrorAction SilentlyContinue
    } catch {}

    # Restore clipboard
    try {
        if ($originalClipboard) {
            Set-Clipboard -Value $originalClipboard -ErrorAction SilentlyContinue
        }
    } catch {}

    # Restore original foreground window
    [BrowserCapture]::SetForegroundWindow($currentForegroundWindow)

    # Output result
    if ($capturedUrl -and ($capturedUrl.StartsWith("http://") -or $capturedUrl.StartsWith("https://"))) {
        Write-Output $capturedUrl.Trim()
    } else {
        Write-Output "ERROR:No valid URL captured from $($targetWindow.ProcessName) - got: $capturedUrl"
    }

} catch {
    Write-Output "ERROR:Script execution failed - $($_.Exception.Message)"
}
`

    // 写入临时脚本文件
    fs.writeFileSync(scriptPath, psScript, 'utf8')

    console.log('Executing browser URL capture script...')

    // 执行脚本
    const { stdout, stderr } = await execAsync(
      `powershell.exe -ExecutionPolicy Bypass -File "${scriptPath}"`,
      {
        encoding: 'utf8',
        timeout: 12000,
        windowsHide: true
      }
    )

    // 清理临时文件
    try {
      fs.unlinkSync(scriptPath)
    } catch (e) {
      console.warn('Failed to clean up script file:', e)
    }

    console.log('Browser capture output:', JSON.stringify(stdout))
    console.log('Browser capture error:', JSON.stringify(stderr))

    const lines = stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    // 找到 URL 行
    for (const line of lines) {
      if (line.startsWith('http://') || line.startsWith('https://')) {
        return {
          success: true,
          url: line
        }
      } else if (line.startsWith('ERROR:')) {
        throw new Error(line.substring(6))
      }
    }

    throw new Error('No valid URL found in output')
  } catch (error) {
    console.error('Error capturing browser URL:', error)

    // 用户友好的错误消息
    let errorMessage = error instanceof Error ? error.message : String(error)

    if (errorMessage.includes('No browser processes running')) {
      errorMessage = 'No browser is currently running'
    } else if (errorMessage.includes('No browser windows found')) {
      errorMessage = 'No browser windows are currently open'
    } else if (errorMessage.includes('No valid URL captured')) {
      errorMessage = 'Could not capture URL from the current browser tab'
    } else if (errorMessage.includes('timeout')) {
      errorMessage = 'URL capture timed out - please try again'
    }

    return {
      success: false,
      error: errorMessage
    }
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  console.log('App ready, setting up...')

  // 配置session以允许跨域请求
  const defaultSession = session.defaultSession

  // 允许所有CORS请求
  defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Access-Control-Allow-Origin': ['*'],
        'Access-Control-Allow-Methods': ['GET, POST, PUT, DELETE, OPTIONS, PATCH'],
        'Access-Control-Allow-Headers': ['*'],
        'Access-Control-Allow-Credentials': ['true']
      }
    })
  })

  // 修改请求头以避免CORS问题
  defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const requestHeaders = { ...details.requestHeaders }

    // 设置通用的Origin头
    if (details.url.includes('api.ppinfra.com') || details.url.includes('openai')) {
      requestHeaders['Origin'] = 'https://api.ppinfra.com'
    } else {
      requestHeaders['Origin'] = details.url
    }

    // 确保Content-Type正确设置
    if (!requestHeaders['Content-Type'] && details.method === 'POST') {
      requestHeaders['Content-Type'] = 'application/json'
    }

    callback({
      requestHeaders
    })
  })

  // 测试网络连接
  setTimeout(async () => {
    try {
      console.log('Testing network connectivity...')
      const response = await fetch('https://httpbin.org/get', {
        method: 'GET',
        headers: {
          'User-Agent': 'Memora-Electron-App'
        }
      })

      if (response.ok) {
        console.log('✅ Network connectivity test passed')
        const data = await response.json()
        console.log('Network test response:', data.url)
      } else {
        console.log('❌ Network connectivity test failed:', response.status)
      }
    } catch (error) {
      console.log('❌ Network test error:', error instanceof Error ? error.message : String(error))
    }
  }, 2000)

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 注意：不在这里注册全局F11快捷键，避免影响其他应用
  // 只在窗口级别禁用全屏功能即可

  // 注册全局快捷键 - Windows 使用 Ctrl+Space，macOS 使用 Cmd+Space
  console.log('Registering global shortcuts...')

  const shortcutKey = process.platform === 'darwin' ? 'Cmd+K' : 'Ctrl+Space'
  console.log('Attempting to register:', shortcutKey)

  const ret = globalShortcut.register(shortcutKey, () => {
    console.log(`Global shortcut triggered: ${shortcutKey}`)
    toggleQuickWindow()
  })

  if (ret) {
    console.log(`Global shortcut ${shortcutKey} registered successfully`)
  } else {
    console.log(`Failed to register ${shortcutKey}, trying Alt+Space`)
    const altRet = globalShortcut.register('Alt+Space', () => {
      console.log('Alt+Space shortcut triggered')
      toggleQuickWindow()
    })

    if (altRet) {
      console.log('Alt+Space registered successfully')
    } else {
      console.error('Failed to register any global shortcut')
    }
  }

  // 检查快捷键是否注册成功
  const isRegistered =
    globalShortcut.isRegistered(shortcutKey) || globalShortcut.isRegistered('Alt+Space')
  console.log('Global shortcut registered:', isRegistered)

  // IPC handlers
  ipcMain.on('ping', () => console.log('pong'))

  ipcMain.handle('show-main-window', () => {
    console.log('IPC: show-main-window called')
    try {
      if (!mainWindow) {
        createWindow()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
      return { success: true }
    } catch (error) {
      console.error('Error showing main window:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('hide-quick-window', () => {
    console.log('IPC: hide-quick-window called')
    try {
      if (quickWindow && quickWindow.isVisible()) {
        quickWindow.hide()
      }
      return { success: true }
    } catch (error) {
      console.error('Error hiding quick window:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // 添加测试用的 IPC 处理器
  ipcMain.handle('test-quick-window', () => {
    console.log('IPC: test-quick-window called')
    toggleQuickWindow()
    return { success: true }
  })

  // 添加获取浏览器 URL 的 IPC 处理器
  ipcMain.handle('capture-edge-url', async () => {
    console.log('IPC: capture-browser-url called')
    return await captureBrowserUrl()
  })

  // 添加新的 IPC handlers
  ipcMain.on('capture-url-start', () => {
    console.log('IPC: capture-url-start received')
    isCapturingUrl = true
    if (quickWindow) {
      quickWindow.setAlwaysOnTop(true)
    }
  })

  ipcMain.on('capture-url-end', () => {
    console.log('IPC: capture-url-end received')
    isCapturingUrl = false
    if (quickWindow) {
      quickWindow.setAlwaysOnTop(true)
    }
  })

  // 添加浏览器检测的 IPC 处理器
  ipcMain.handle('detect-active-browser', async () => {
    console.log('IPC: detect-active-browser called')
    return await detectActiveBrowser()
  })

  // 本地数据库 IPC 处理器
  // 用户相关
  ipcMain.handle('db-create-user', async (_, user) => {
    try {
      const result = localDb.createUser(user)
      return { success: true, data: result }
    } catch (error) {
      console.error('Database error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('db-get-user-by-id', async (_, id) => {
    try {
      const result = localDb.getUserById(id)
      return { success: true, data: result }
    } catch (error) {
      console.error('Database error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('db-get-user-by-username', async (_, username) => {
    try {
      const result = localDb.getUserByUsername(username)
      return { success: true, data: result }
    } catch (error) {
      console.error('Database error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('db-get-user-by-email', async (_, email) => {
    try {
      const result = localDb.getUserByEmail(email)
      return { success: true, data: result }
    } catch (error) {
      console.error('Database error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('db-update-user', async (_, id, updates) => {
    try {
      localDb.updateUser(id, updates)
      return { success: true }
    } catch (error) {
      console.error('Database error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // 分类相关
  ipcMain.handle('db-create-category', async (_, category) => {
    try {
      const result = localDb.createCategory(category)
      return { success: true, data: result }
    } catch (error) {
      console.error('Database error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('db-get-categories-by-user-id', async (_, userId) => {
    try {
      const result = localDb.getCategoriesByUserId(userId)
      return { success: true, data: result }
    } catch (error) {
      console.error('Database error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // 集合相关
  ipcMain.handle('db-create-collection', async (_, collection) => {
    try {
      const result = localDb.createCollection(collection)
      return { success: true, data: result }
    } catch (error) {
      console.error('Database error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('db-get-collections-by-user-id', async (_, userId) => {
    try {
      const result = localDb.getCollectionsByUserId(userId)
      return { success: true, data: result }
    } catch (error) {
      console.error('Database error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('db-get-collection-by-id', async (_, id) => {
    try {
      const result = localDb.getCollectionById(id)
      return { success: true, data: result }
    } catch (error) {
      console.error('Database error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // 集合详情相关
  ipcMain.handle('db-create-collection-detail', async (_, detail) => {
    try {
      const result = localDb.createCollectionDetail(detail)
      return { success: true, data: result }
    } catch (error) {
      console.error('Database error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('db-get-collection-details', async (_, collectionId) => {
    try {
      const result = localDb.getCollectionDetails(collectionId)
      return { success: true, data: result }
    } catch (error) {
      console.error('Database error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // 附件相关
  ipcMain.handle('db-create-attachment', async (_, attachment) => {
    try {
      const result = localDb.createAttachment(attachment)
      return { success: true, data: result }
    } catch (error) {
      console.error('Database error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('db-get-attachments-by-user-id', async (_, userId) => {
    try {
      const result = localDb.getAttachmentsByUserId(userId)
      return { success: true, data: result }
    } catch (error) {
      console.error('Database error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // 帖子相关
  ipcMain.handle('db-create-post', async (_, post) => {
    try {
      const result = localDb.createPost(post)
      return { success: true, data: result }
    } catch (error) {
      console.error('Database error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('db-get-posts-by-user-id', async (_, userId) => {
    try {
      const result = localDb.getPostsByUserId(userId)
      return { success: true, data: result }
    } catch (error) {
      console.error('Database error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('db-get-posts-by-collection-id', async (_, collectionId) => {
    try {
      const result = localDb.getPostsByCollectionId(collectionId)
      return { success: true, data: result }
    } catch (error) {
      console.error('Database error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // 私有帖子相关
  ipcMain.handle('db-get-private-posts-by-user-id', async (_, userId) => {
    try {
      const result = localDb.getPrivatePostsByUserId(userId)
      return { success: true, data: result }
    } catch (error) {
      console.error('Database error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('db-get-public-posts-by-user-id', async (_, userId) => {
    try {
      const result = localDb.getPublicPostsByUserId(userId)
      return { success: true, data: result }
    } catch (error) {
      console.error('Database error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('db-update-post-privacy', async (_, postId, isPrivate) => {
    try {
      const result = localDb.updatePostPrivacy(postId, isPrivate)
      return { success: true, data: result }
    } catch (error) {
      console.error('Database error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // 评论相关
  ipcMain.handle('db-create-comment', async (_, comment) => {
    try {
      const result = localDb.createComment(comment)
      return { success: true, data: result }
    } catch (error) {
      console.error('Database error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('db-get-comments-by-post-id', async (_, postId) => {
    try {
      const result = localDb.getCommentsByPostId(postId)
      return { success: true, data: result }
    } catch (error) {
      console.error('Database error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // 点赞相关
  ipcMain.handle('db-create-like', async (_, like) => {
    try {
      const result = localDb.createLike(like)
      return { success: true, data: result }
    } catch (error) {
      console.error('Database error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('db-remove-like', async (_, userId, assetId, assetType) => {
    try {
      localDb.removeLike(userId, assetId, assetType)
      return { success: true }
    } catch (error) {
      console.error('Database error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('db-get-likes-by-asset', async (_, assetId, assetType) => {
    try {
      const result = localDb.getLikesByAsset(assetId, assetType)
      return { success: true, data: result }
    } catch (error) {
      console.error('Database error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // AI 服务 IPC 处理器
  ipcMain.handle('ai-configure', async (_, config) => {
    console.log('AI Configure IPC called with config:', {
      provider: config.provider,
      baseURL: config.baseURL,
      model: config.model,
      hasApiKey: !!config.apiKey
    })

    try {
      aiService.configure(config)
      console.log('AI service configured successfully')
      return { success: true }
    } catch (error) {
      console.error('AI configure error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('ai-chat', async (_, messages, options) => {
    console.log('AI Chat IPC called with:', {
      messageCount: messages.length,
      options
    })

    try {
      const result = await aiService.chat(messages, options)
      console.log('AI chat completed:', {
        success: result.success,
        contentLength: result.content?.length || 0,
        error: result.error
      })
      return result
    } catch (error) {
      console.error('AI chat error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('ai-summarize', async (_, content) => {
    try {
      const result = await aiService.summarizeContent(content)
      return result
    } catch (error) {
      console.error('AI summarize error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('ai-categorize', async (_, content, categories) => {
    try {
      const result = await aiService.categorizeContent(content, categories)
      return result
    } catch (error) {
      console.error('AI categorize error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('ai-query-knowledge', async (_, query, documents) => {
    try {
      const result = await aiService.queryKnowledgeBase(query, documents)
      return result
    } catch (error) {
      console.error('AI knowledge query error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('ai-is-configured', () => {
    return aiService.isConfigured()
  })

  ipcMain.handle('ai-get-config', () => {
    return aiService.getConfig()
  })

  // 向量存储相关
  ipcMain.handle('kb-add-document', async (_, document, collectionId) => {
    try {
      const result = vectorStore.addDocument(document, collectionId)
      return { success: true, data: result }
    } catch (error) {
      console.error('Vector store error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('kb-remove-document', async (_, documentId) => {
    try {
      const result = vectorStore.removeDocument(documentId)
      return { success: true, data: result }
    } catch (error) {
      console.error('Vector store error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('kb-search-documents', async (_, query, limit) => {
    try {
      const result = vectorStore.searchSimilar(query, limit || 10)
      return { success: true, data: result }
    } catch (error) {
      console.error('Vector store error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('kb-get-document', async (_, documentId) => {
    try {
      const result = vectorStore.getDocument(documentId)
      return { success: true, data: result }
    } catch (error) {
      console.error('Vector store error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('kb-get-all-documents', async (_, limit) => {
    try {
      const result = vectorStore.getAllDocuments(limit || 100)
      return { success: true, data: result }
    } catch (error) {
      console.error('Vector store error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('kb-create-collection', async (_, id, name, description) => {
    try {
      vectorStore.createCollection(id, name, description)
      return { success: true }
    } catch (error) {
      console.error('Vector store error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('kb-remove-collection', async (_, collectionId) => {
    try {
      const result = vectorStore.removeCollection(collectionId)
      return { success: true, data: result }
    } catch (error) {
      console.error('Vector store error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('kb-add-document-to-collection', async (_, documentId, collectionId) => {
    try {
      vectorStore.addDocumentToCollection(documentId, collectionId)
      return { success: true }
    } catch (error) {
      console.error('Vector store error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('kb-remove-document-from-collection', async (_, documentId, collectionId) => {
    try {
      const result = vectorStore.removeDocumentFromCollection(documentId, collectionId)
      return { success: true, data: result }
    } catch (error) {
      console.error('Vector store error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('kb-get-collection-documents', async (_, collectionId) => {
    try {
      const result = vectorStore.getCollectionDocuments(collectionId)
      return { success: true, data: result }
    } catch (error) {
      console.error('Vector store error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('kb-get-collections', async () => {
    try {
      const result = vectorStore.getCollections()
      return { success: true, data: result }
    } catch (error) {
      console.error('Vector store error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // 初始化本地数据库和向量存储
  console.log('Initializing local databases...')
  try {
    // 强制初始化数据库 - 这将创建数据库文件
    localDb['getDb']()
    console.log('Database initialized successfully')

    // 强制初始化向量存储 - 这将创建向量数据库文件
    vectorStore['getDb']()
    console.log('Vector store initialized successfully')

    // 执行一些数据库操作来确保数据库被使用
    console.log('Performing test database operations...')
    try {
      // 尝试获取不存在的用户，这会创建数据库表
      localDb.getUserById('1')
    } catch (userError) {
      console.log('Expected: User 1 does not exist yet')
    }

    try {
      // 尝试获取向量存储中的文档
      vectorStore.getAllDocuments(1)
    } catch (vectorError) {
      console.log('Expected: No documents exist yet')
    }

    console.log('Database initialization and test operations completed')
  } catch (error) {
    console.error('Database initialization failed, but continuing:', error instanceof Error ? error.message : String(error))
    console.log('Application will continue without local databases')
    console.log('Database will be initialized on first use')
  }

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Add a delay to allow database operations to complete
    setTimeout(() => {
      app.quit()
    }, 2000) // 2 second delay
  }
})

app.on('will-quit', () => {
  // 关闭本地数据库连接
  console.log('Closing local database connection')
  localDb.close()

  // 注销所有全局快捷键
  console.log('Unregistering all global shortcuts')
  globalShortcut.unregisterAll()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
