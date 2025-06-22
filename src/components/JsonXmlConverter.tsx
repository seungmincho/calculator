'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { 
  RefreshCw, 
  Copy, 
  Check, 
  Download, 
  Upload,
  AlertTriangle,
  CheckCircle,
  FileText,
  Code,
  Settings,
  Braces,
  FileCode
} from 'lucide-react'

interface ValidationResult {
  isValid: boolean
  error?: string
  lineNumber?: number
}

const JsonXmlConverter = () => {
  const t = useTranslations('jsonXmlConverter')
  const tc = useTranslations('common')
  
  const [jsonInput, setJsonInput] = useState<string>('')
  const [xmlInput, setXmlInput] = useState<string>('')
  const [jsonOutput, setJsonOutput] = useState<string>('')
  const [xmlOutput, setXmlOutput] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'json-to-xml' | 'xml-to-json'>('json-to-xml')
  const [jsonValidation, setJsonValidation] = useState<ValidationResult>({ isValid: true })
  const [xmlValidation, setXmlValidation] = useState<ValidationResult>({ isValid: true })
  const [isCopied, setIsCopied] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  
  // Conversion options
  const [options, setOptions] = useState({
    prettyPrint: true,
    includeDeclaration: true,
    rootElementName: 'root',
    arrayElementName: 'item',
    textNodeName: '_text',
    attributePrefix: '@',
    ignoreAttributes: false,
    parseAttributes: true
  })

  // Developer presets
  const presets = useMemo(() => ({
    soap: {
      name: t('presets.soap.name'),
      description: t('presets.soap.description'),
      json: JSON.stringify({
        "soap:Envelope": {
          "@xmlns:soap": "http://schemas.xmlsoap.org/soap/envelope/",
          "soap:Header": {},
          "soap:Body": {
            "GetUserRequest": {
              "UserId": "12345"
            }
          }
        }
      }, null, 2),
      xml: `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Header></soap:Header>
  <soap:Body>
    <GetUserRequest>
      <UserId>12345</UserId>
    </GetUserRequest>
  </soap:Body>
</soap:Envelope>`
    },
    rss: {
      name: t('presets.rss.name'),
      description: t('presets.rss.description'),
      json: JSON.stringify({
        "rss": {
          "@version": "2.0",
          "channel": {
            "title": "Example RSS Feed",
            "link": "https://example.com",
            "description": "Example RSS feed description",
            "item": [
              {
                "title": "First Article",
                "link": "https://example.com/article1",
                "description": "Description of first article"
              }
            ]
          }
        }
      }, null, 2),
      xml: `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Example RSS Feed</title>
    <link>https://example.com</link>
    <description>Example RSS feed description</description>
    <item>
      <title>First Article</title>
      <link>https://example.com/article1</link>
      <description>Description of first article</description>
    </item>
  </channel>
</rss>`
    },
    config: {
      name: t('presets.config.name'),
      description: t('presets.config.description'),
      json: JSON.stringify({
        "configuration": {
          "database": {
            "host": "localhost",
            "port": 5432,
            "name": "myapp"
          },
          "security": {
            "enabled": true,
            "encryption": "AES256"
          }
        }
      }, null, 2),
      xml: `<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <database>
    <host>localhost</host>
    <port>5432</port>
    <name>myapp</name>
  </database>
  <security>
    <enabled>true</enabled>
    <encryption>AES256</encryption>
  </security>
</configuration>`
    },
    api: {
      name: t('presets.api.name'),
      description: t('presets.api.description'),
      json: JSON.stringify({
        "user": {
          "id": 1,
          "name": "John Doe",
          "email": "john@example.com",
          "address": {
            "street": "123 Main St",
            "city": "Anytown",
            "country": "USA"
          },
          "hobbies": ["reading", "swimming", "coding"]
        }
      }, null, 2),
      xml: `<?xml version="1.0" encoding="UTF-8"?>
<user>
  <id>1</id>
  <name>John Doe</name>
  <email>john@example.com</email>
  <address>
    <street>123 Main St</street>
    <city>Anytown</city>
    <country>USA</country>
  </address>
  <hobbies>
    <item>reading</item>
    <item>swimming</item>
    <item>coding</item>
  </hobbies>
</user>`
    }
  }), [t])

  // JSON validation
  const validateJson = useCallback((jsonString: string): ValidationResult => {
    if (!jsonString.trim()) {
      return { isValid: true }
    }
    
    try {
      JSON.parse(jsonString)
      return { isValid: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const lineMatch = errorMessage.match(/line (\d+)/i)
      const lineNumber = lineMatch ? parseInt(lineMatch[1]) : undefined
      
      return {
        isValid: false,
        error: errorMessage,
        lineNumber
      }
    }
  }, [])

  // XML validation
  const validateXml = useCallback((xmlString: string): ValidationResult => {
    if (!xmlString.trim()) {
      return { isValid: true }
    }
    
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(xmlString, 'text/xml')
      const parserError = doc.querySelector('parsererror')
      
      if (parserError) {
        return {
          isValid: false,
          error: parserError.textContent || 'XML parsing error'
        }
      }
      
      return { isValid: true }
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown XML error'
      }
    }
  }, [])

  // JSON to XML conversion
  const jsonToXml = useCallback((jsonString: string): string => {
    try {
      const jsonData = JSON.parse(jsonString)
      
      const convertValue = (value: any, key?: string): string => {
        if (value === null || value === undefined) {
          return key ? `<${key}></${key}>` : ''
        }
        
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          return key ? `<${key}>${String(value)}</${key}>` : String(value)
        }
        
        if (Array.isArray(value)) {
          const elementName = key || options.arrayElementName
          return value.map(item => convertValue(item, elementName)).join('\n')
        }
        
        if (typeof value === 'object') {
          let xml = ''
          const entries = Object.entries(value)
          
          for (const [objKey, objValue] of entries) {
            if (objKey.startsWith(options.attributePrefix) && !options.ignoreAttributes) {
              // Skip attributes in this simple implementation
              continue
            }
            xml += convertValue(objValue, objKey) + '\n'
          }
          
          if (key) {
            // Handle attributes
            const attributes = entries
              .filter(([k]) => k.startsWith(options.attributePrefix) && !options.ignoreAttributes)
              .map(([k, v]) => `${k.substring(1)}="${v}"`)
              .join(' ')
            
            const attrString = attributes ? ` ${attributes}` : ''
            const content = xml.trim()
            
            if (content) {
              return `<${key}${attrString}>\n${content}\n</${key}>`
            } else {
              return `<${key}${attrString}></${key}>`
            }
          }
          
          return xml
        }
        
        return ''
      }
      
      let result = ''
      
      // Handle top-level arrays properly
      if (Array.isArray(jsonData)) {
        const rootContent = jsonData.map(item => convertValue(item, options.arrayElementName)).join('\n')
        result = `<${options.rootElementName}>\n${rootContent}\n</${options.rootElementName}>`
      } else {
        result = convertValue(jsonData, options.rootElementName)
      }
      
      if (options.includeDeclaration) {
        result = '<?xml version="1.0" encoding="UTF-8"?>\n' + result
      }
      
      if (options.prettyPrint) {
        // Simple pretty printing
        result = result.replace(/>\s*</g, '>\n<')
        const lines = result.split('\n')
        let indentLevel = 0
        const indentedLines = lines.map(line => {
          const trimmed = line.trim()
          if (!trimmed) return ''
          
          if (trimmed.startsWith('</')) {
            indentLevel = Math.max(0, indentLevel - 1)
          }
          
          const indented = '  '.repeat(indentLevel) + trimmed
          
          if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.includes('/>') && !trimmed.startsWith('<?')) {
            indentLevel++
          }
          
          return indented
        })
        
        result = indentedLines.filter(line => line.trim()).join('\n')
      }
      
      return result
    } catch (error) {
      throw new Error(`JSON conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [options])

  // XML to JSON conversion
  const xmlToJson = useCallback((xmlString: string): string => {
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(xmlString, 'text/xml')
      
      const parserError = doc.querySelector('parsererror')
      if (parserError) {
        throw new Error('Invalid XML format')
      }
      
      const convertElement = (element: Element): any => {
        const result: any = {}
        
        // Handle attributes
        if (element.attributes.length > 0 && !options.ignoreAttributes) {
          for (let i = 0; i < element.attributes.length; i++) {
            const attr = element.attributes[i]
            result[options.attributePrefix + attr.name] = attr.value
          }
        }
        
        const children = Array.from(element.children)
        const textContent = element.textContent?.trim()
        
        if (children.length === 0) {
          // Leaf element
          if (textContent) {
            if (Object.keys(result).length > 0) {
              result[options.textNodeName] = textContent
            } else {
              return textContent
            }
          }
          return Object.keys(result).length > 0 ? result : textContent || ''
        }
        
        // Group children by tag name
        const childGroups: { [key: string]: Element[] } = {}
        children.forEach(child => {
          const tagName = child.tagName
          if (!childGroups[tagName]) {
            childGroups[tagName] = []
          }
          childGroups[tagName].push(child)
        })
        
        // Convert children
        Object.entries(childGroups).forEach(([tagName, elements]) => {
          if (elements.length === 1) {
            result[tagName] = convertElement(elements[0])
          } else {
            result[tagName] = elements.map(convertElement)
          }
        })
        
        return result
      }
      
      const rootElement = doc.documentElement
      const converted = { [rootElement.tagName]: convertElement(rootElement) }
      
      return JSON.stringify(converted, null, options.prettyPrint ? 2 : 0)
    } catch (error) {
      throw new Error(`XML conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [options])

  // Handle conversion
  const handleConvert = useCallback(async () => {
    setIsConverting(true)
    
    try {
      if (activeTab === 'json-to-xml') {
        const validation = validateJson(jsonInput)
        setJsonValidation(validation)
        
        if (!validation.isValid) {
          setXmlOutput('')
          return
        }
        
        if (jsonInput.trim()) {
          const converted = jsonToXml(jsonInput)
          setXmlOutput(converted)
        } else {
          setXmlOutput('')
        }
      } else {
        const validation = validateXml(xmlInput)
        setXmlValidation(validation)
        
        if (!validation.isValid) {
          setJsonOutput('')
          return
        }
        
        if (xmlInput.trim()) {
          const converted = xmlToJson(xmlInput)
          setJsonOutput(converted)
        } else {
          setJsonOutput('')
        }
      }
    } catch (error) {
      if (activeTab === 'json-to-xml') {
        setJsonValidation({
          isValid: false,
          error: error instanceof Error ? error.message : 'Conversion failed'
        })
      } else {
        setXmlValidation({
          isValid: false,
          error: error instanceof Error ? error.message : 'Conversion failed'
        })
      }
    } finally {
      setIsConverting(false)
    }
  }, [activeTab, jsonInput, xmlInput, validateJson, validateXml, jsonToXml, xmlToJson])

  // Handle input change
  const handleInputChange = useCallback((value: string, type: 'json' | 'xml') => {
    if (type === 'json') {
      setJsonInput(value)
      const validation = validateJson(value)
      setJsonValidation(validation)
    } else {
      setXmlInput(value)
      const validation = validateXml(value)
      setXmlValidation(validation)
    }
  }, [validateJson, validateXml])

  // Load preset
  const loadPreset = useCallback((presetKey: string) => {
    const preset = presets[presetKey as keyof typeof presets]
    if (preset) {
      if (activeTab === 'json-to-xml') {
        setJsonInput(preset.json)
        setJsonValidation({ isValid: true })
        setXmlOutput('')
      } else {
        setXmlInput(preset.xml)
        setXmlValidation({ isValid: true })
        setJsonOutput('')
      }
    }
  }, [activeTab, presets])

  // Copy to clipboard
  const copyToClipboard = useCallback(async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      } else {
        // Fallback
        const textArea = document.createElement('textarea')
        textArea.value = text
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      }
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }, [])

  // Download file
  const downloadFile = useCallback((content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }, [])

  // File upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>, type: 'json' | 'xml') => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        handleInputChange(content, type)
      }
      reader.readAsText(file)
    }
  }, [handleInputChange])

  // Auto-convert on input change
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleConvert()
    }, 500)
    
    return () => clearTimeout(timeoutId)
  }, [handleConvert])

  const currentInput = activeTab === 'json-to-xml' ? jsonInput : xmlInput
  const currentOutput = activeTab === 'json-to-xml' ? xmlOutput : jsonOutput
  const currentValidation = activeTab === 'json-to-xml' ? jsonValidation : xmlValidation

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
          {t('title')}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          {t('description')}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center">
        <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('json-to-xml')}
            className={`px-6 py-3 rounded-md font-medium transition-colors ${
              activeTab === 'json-to-xml'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Braces className="w-4 h-4" />
              <span>{t('tabs.jsonToXml')}</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('xml-to-json')}
            className={`px-6 py-3 rounded-md font-medium transition-colors ${
              activeTab === 'xml-to-json'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              <FileCode className="w-4 h-4" />
              <span>{t('tabs.xmlToJson')}</span>
            </div>
          </button>
        </div>
      </div>

      {/* Developer Presets */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Code className="w-5 h-5 text-purple-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('presets.title')}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(presets).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => loadPreset(key)}
              className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-purple-500 dark:hover:border-purple-400 transition-colors text-left"
            >
              <div className="font-medium text-gray-900 dark:text-white mb-1">
                {preset.name}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {preset.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Converter */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Input Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              {activeTab === 'json-to-xml' ? (
                <Braces className="w-5 h-5 text-blue-600" />
              ) : (
                <FileCode className="w-5 h-5 text-green-600" />
              )}
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {activeTab === 'json-to-xml' ? t('input.jsonTitle') : t('input.xmlTitle')}
              </h2>
            </div>
            <div className="flex items-center space-x-2">
              <label className="cursor-pointer p-2 text-gray-500 hover:text-blue-600 transition-colors">
                <Upload className="w-4 h-4" />
                <input
                  type="file"
                  accept={activeTab === 'json-to-xml' ? '.json' : '.xml'}
                  onChange={(e) => handleFileUpload(e, activeTab === 'json-to-xml' ? 'json' : 'xml')}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <textarea
              value={currentInput}
              onChange={(e) => handleInputChange(e.target.value, activeTab === 'json-to-xml' ? 'json' : 'xml')}
              placeholder={activeTab === 'json-to-xml' ? t('input.jsonPlaceholder') : t('input.xmlPlaceholder')}
              className="w-full h-96 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm resize-none"
            />

            {/* Validation Status */}
            <div className="flex items-center space-x-2">
              {currentValidation.isValid ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600 dark:text-green-400">
                    {t('validation.valid')}
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-600 dark:text-red-400">
                    {currentValidation.error}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Output Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              {activeTab === 'json-to-xml' ? (
                <FileCode className="w-5 h-5 text-green-600" />
              ) : (
                <Braces className="w-5 h-5 text-blue-600" />
              )}
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {activeTab === 'json-to-xml' ? t('output.xmlTitle') : t('output.jsonTitle')}
              </h2>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => copyToClipboard(currentOutput)}
                disabled={!currentOutput}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{isCopied ? tc('copied') : tc('copy')}</span>
              </button>
              <button
                onClick={() => downloadFile(
                  currentOutput,
                  `converted.${activeTab === 'json-to-xml' ? 'xml' : 'json'}`,
                  activeTab === 'json-to-xml' ? 'application/xml' : 'application/json'
                )}
                disabled={!currentOutput}
                className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>{tc('export')}</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <textarea
              value={currentOutput}
              readOnly
              placeholder={activeTab === 'json-to-xml' ? t('output.xmlPlaceholder') : t('output.jsonPlaceholder')}
              className="w-full h-96 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm resize-none"
            />

            {isConverting && (
              <div className="flex items-center space-x-2 text-blue-600">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-sm">{t('converting')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Conversion Options */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Settings className="w-5 h-5 text-gray-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('options.title')}
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 dark:text-white">
              {t('options.formatting.title')}
            </h3>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={options.prettyPrint}
                onChange={(e) => setOptions(prev => ({ ...prev, prettyPrint: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {t('options.formatting.prettyPrint')}
              </span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={options.includeDeclaration}
                onChange={(e) => setOptions(prev => ({ ...prev, includeDeclaration: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {t('options.formatting.includeDeclaration')}
              </span>
            </label>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 dark:text-white">
              {t('options.structure.title')}
            </h3>
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                {t('options.structure.rootElement')}
              </label>
              <input
                type="text"
                value={options.rootElementName}
                onChange={(e) => setOptions(prev => ({ ...prev, rootElementName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                {t('options.structure.arrayElement')}
              </label>
              <input
                type="text"
                value={options.arrayElementName}
                onChange={(e) => setOptions(prev => ({ ...prev, arrayElementName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 dark:text-white">
              {t('options.attributes.title')}
            </h3>
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                {t('options.attributes.prefix')}
              </label>
              <input
                type="text"
                value={options.attributePrefix}
                onChange={(e) => setOptions(prev => ({ ...prev, attributePrefix: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={options.ignoreAttributes}
                onChange={(e) => setOptions(prev => ({ ...prev, ignoreAttributes: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {t('options.attributes.ignore')}
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Guide */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <FileText className="w-8 h-8 text-blue-600" />
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('guide.title')}
            </h2>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            {t('guide.description')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('guide.features.title')}
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-gray-700 dark:text-gray-300">
                  {t('guide.features.realtime')}
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-gray-700 dark:text-gray-300">
                  {t('guide.features.validation')}
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-gray-700 dark:text-gray-300">
                  {t('guide.features.presets')}
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-gray-700 dark:text-gray-300">
                  {t('guide.features.options')}
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('guide.useCases.title')}
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-gray-700 dark:text-gray-300">
                  {t('guide.useCases.api')}
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-gray-700 dark:text-gray-300">
                  {t('guide.useCases.config')}
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-gray-700 dark:text-gray-300">
                  {t('guide.useCases.legacy')}
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-gray-700 dark:text-gray-300">
                  {t('guide.useCases.data')}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default JsonXmlConverter