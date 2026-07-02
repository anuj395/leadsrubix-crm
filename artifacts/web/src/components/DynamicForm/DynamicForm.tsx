/**
 * components/DynamicForm
 *
 * Renders a 3-column responsive form based on the dynamic screen-config
 * resolved for the authenticated user. Field types supported:
 *   - text, email, number, textarea, date, checkbox  → native MUI inputs
 *   - select with dropdown_source='static'           → <Select> from `options[]`
 *   - select with dropdown_source='api'              → fetches dropdown_api on
 *                                                       first render (cached)
 *   - badge / avatar                                 → treated as text inputs
 *                                                       (form context, not table)
 *
 * Required fields show a red `*`. Empty required fields block submission.
 *
 * Dropdown API responses must be either:
 *   - { items: [{ value, label }, ...] } (preferred)
 *   - { items: ["a", "b", ...] }
 *   - [{ value, label }, ...]
 *   - ["a", "b", ...]
 */
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import Select from '@mui/material/Select'
import InputAdornment from '@mui/material/InputAdornment'
import { resolveScreen, type ResolvedFormField } from '@/services/screenAdminService'
import { api } from '@/services/api'

type Value = string | number | boolean | null

interface DropdownOption {
  value: string
  label: string
}

function normalizeOptions(raw: unknown): DropdownOption[] {
  // Accept array or {items: array}; entries can be strings or {value,label}.
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { items?: unknown })?.items)
      ? ((raw as { items: unknown[] }).items)
      : []
  return list.map((entry) => {
    if (entry && typeof entry === 'object') {
      const e = entry as Record<string, unknown>
      const v = e.value ?? e.id ?? e.key ?? e.label ?? ''
      const l = e.label ?? e.name ?? e.title ?? String(v)
      return { value: String(v), label: String(l) }
    }
    return { value: String(entry), label: String(entry) }
  })
}

// Module-level cache so re-mounting the form doesn't refetch the same dropdown.
const dropdownCache = new Map<string, DropdownOption[]>()

const DIALING_CODES = [
  { code: '+91', flag: '🇮🇳', label: '🇮🇳 +91 (India)' },
  { code: '+1', flag: '🇺🇸', label: '🇺🇸 +1 (US)' },
  { code: '+1', flag: '🇨🇦', label: '🇨🇦 +1 (Canada)' },
  { code: '+44', flag: '🇬🇧', label: '🇬🇧 +44 (UK)' },
  { code: '+61', flag: '🇦🇺', label: '🇦🇺 +61 (Australia)' },
  { code: '+971', flag: '🇦🇪', label: '🇦🇪 +971 (UAE)' },
  { code: '+65', flag: '🇸🇬', label: '🇸🇬 +65 (Singapore)' },
  { code: '+966', flag: '🇸🇦', label: '🇸🇦 +966 (Saudi Arabia)' },
  { code: '+49', flag: '🇩🇪', label: '🇩🇪 +49 (Germany)' },
  { code: '+33', flag: '🇫🇷', label: '🇫🇷 +33 (France)' },
  { code: '+27', flag: '🇿🇦', label: '🇿🇦 +27 (South Africa)' },
  { code: '+81', flag: '🇯🇵', label: '🇯🇵 +81 (Japan)' },
  { code: '+64', flag: '🇳🇿', label: '🇳🇿 +64 (New Zealand)' },
  { code: '+60', flag: '🇲🇾', label: '🇲🇾 +60 (Malaysia)' },
  { code: '+353', flag: '🇮🇪', label: '🇮🇪 +353 (Ireland)' },
  { code: '+39', flag: '🇮🇹', label: '🇮🇹 +39 (Italy)' },
  { code: '+31', flag: '🇳🇱', label: '🇳🇱 +31 (Netherlands)' },
  { code: '+34', flag: '🇪🇸', label: '🇪🇸 +34 (Spain)' },
  { code: '+41', flag: '🇨🇭', label: '🇨🇭 +41 (Switzerland)' },
  { code: '+46', flag: '🇸🇪', label: '🇸🇪 +46 (Sweden)' },
  { code: '+47', flag: '🇳🇴', label: '🇳🇴 +47 (Norway)' },
  { code: '+45', flag: '🇩🇰', label: '🇩🇰 +45 (Denmark)' },
  { code: '+358', flag: '🇫🇮', label: '🇫🇮 +358 (Finland)' },
  { code: '+55', flag: '🇧🇷', label: '🇧🇷 +55 (Brazil)' },
  { code: '+52', flag: '🇲🇽', label: '🇲🇽 +52 (Mexico)' },
  { code: '+7', flag: '🇷🇺', label: '🇷🇺 +7 (Russia)' },
  { code: '+86', flag: '🇨🇳', label: '🇨🇳 +86 (China)' },
  { code: '+852', flag: '🇭🇰', label: '🇭🇰 +852 (Hong Kong)' },
  { code: '+886', flag: '🇹🇼', label: '🇹🇼 +886 (Taiwan)' },
  { code: '+82', flag: '🇰🇷', label: '🇰🇷 +82 (South Korea)' },
  { code: '+90', flag: '🇹🇷', label: '🇹🇷 +90 (Turkey)' },
  { code: '+20', flag: '🇪🇬', label: '🇪🇬 +20 (Egypt)' },
  { code: '+234', flag: '🇳🇬', label: '🇳🇬 +234 (Nigeria)' },
  { code: '+254', flag: '🇰🇪', label: '🇰🇪 +254 (Kenya)' },
  { code: '+880', flag: '🇧🇩', label: '🇧🇩 +880 (Bangladesh)' },
  { code: '+92', flag: '🇵🇰', label: '🇵🇰 +92 (Pakistan)' },
  { code: '+94', flag: '🇱🇰', label: '🇱🇰 +94 (Sri Lanka)' },
  { code: '+977', flag: '🇳🇵', label: '🇳🇵 +977 (Nepal)' },
  { code: '+66', flag: '🇹🇭', label: '🇹🇭 +66 (Thailand)' },
  { code: '+84', flag: '🇻🇳', label: '🇻🇳 +84 (Vietnam)' },
  { code: '+62', flag: '🇮🇩', label: '🇮🇩 +62 (Indonesia)' },
  { code: '+63', flag: '🇵🇭', label: '🇵🇭 +63 (Philippines)' },
  { code: '+54', flag: '🇦🇷', label: '🇦🇷 +54 (Argentina)' },
  { code: '+57', flag: '🇨🇴', label: '🇨🇴 +57 (Colombia)' },
  { code: '+51', flag: '🇵🇪', label: '🇵🇪 +51 (Peru)' },
  { code: '+56', flag: '🇨🇱', label: '🇨🇱 +56 (Chile)' },
  { code: '+43', flag: '🇦🇹', label: '🇦🇹 +43 (Austria)' },
  { code: '+32', flag: '🇧🇪', label: '🇧🇪 +32 (Belgium)' },
  { code: '+48', flag: '🇵🇱', label: '🇵🇱 +48 (Poland)' },
  { code: '+30', flag: '🇬🇷', label: '🇬🇷 +30 (Greece)' },
]


interface Props {
  screen: string
  /** Optional override; only honored server-side for superAdmin callers. */
  industry_code?: string
  /** Optional override; only honored server-side for superAdmin callers. */
  role_key?: string
  initialValues?: Record<string, Value>
  onSubmit: (values: Record<string, Value>) => Promise<void> | void
  onCancel?: () => void
  submitLabel?: string
  /** Optional extra fields rendered above the dynamic ones (e.g. core User fields). */
  headerSlot?: ReactNode
  /** Hide built-in submit/cancel actions when the parent provides its own. */
  hideActions?: boolean
  readOnly?: boolean
  fullWidthSubmit?: boolean
}

export function DynamicForm({
  screen,
  industry_code,
  role_key,
  initialValues = {},
  onSubmit,
  onCancel,
  submitLabel = 'Save',
  headerSlot,
  hideActions = false,
  readOnly = false,
  fullWidthSubmit = false,
}: Props) {
  const [fields, setFields] = useState<ResolvedFormField[]>([])
  const [values, setValues] = useState<Record<string, Value>>(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [trialPeriodLicenses, setTrialPeriodLicenses] = useState<number>(10)

  useEffect(() => {
    let cancelled = false
    if (screen === 'organization') {
      void api.get('pricing-plans')
        .then((res) => {
          if (cancelled) return
          const plans = res.data || []
          const plan = plans[0] || {}
          if (typeof plan.trialPeriodLicenses === 'number') {
            setTrialPeriodLicenses(plan.trialPeriodLicenses)
          }
        })
        .catch((err) => {
          console.error('Failed to load trial period licenses:', err)
        })
    }
    return () => {
      cancelled = true
    }
  }, [screen])

  // Per-field async dropdown state. Keyed by `dropdown_api` URL so two fields
  // pointing at the same source share results.
  const [dropdowns, setDropdowns] = useState<Record<string, DropdownOption[]>>({})
  const [dropdownLoading, setDropdownLoading] = useState<Record<string, boolean>>({})

  // 1) Load form config. Re-runs when screen/role/industry change so the
  // Add/Edit User flow can swap fields the instant a different role is
  // selected.
  useEffect(() => {
    let cancelled = false
    setLoadingConfig(true)
    void (async () => {
      try {
        const data = await resolveScreen({
          screen_key: screen,
          industry_code,
          role_key,
        })
        if (cancelled) return
        setFields(data.form_fields)
        // Seed defaults for newly-introduced fields without clobbering user input.
        setValues((prev) => {
          const next = { ...prev }
          for (const f of data.form_fields) {
            if (next[f.key] === undefined) {
              next[f.key] = f.type === 'checkbox' ? false : ''
            }
          }
          return next
        })
      } catch (err) {
        if (cancelled) return
        // A missing screen/role/industry combo just means "no extra fields are
        // configured for this context" — which is a perfectly valid state for
        // an Add/Edit dialog. Don't surface that as an error toast; only flag
        // genuine network/server failures.
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status === 404 || status === 400) {
          setFields([])
        } else {
          const msg = err instanceof Error ? err.message : 'Failed to load form'
          setSubmitError(msg)
        }
      } finally {
        if (!cancelled) setLoadingConfig(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, industry_code, role_key])

  // 2) Lazy-load API dropdowns once we know which fields need them.
  useEffect(() => {
    let cancelled = false
    const apiFields = fields.filter(
      (f) => f.type === 'select' && f.dropdown_source === 'api' && f.dropdown_api,
    )
    for (const f of apiFields) {
      let url = f.dropdown_api
      // Append country to states API dynamically so we fetch the country-specific states
      if (url.includes('options/states') && values.country) {
        url = `${url}?country=${encodeURIComponent(String(values.country))}`
      }
      
      if (dropdownCache.has(url)) {
        // already cached — hydrate immediately
        setDropdowns((prev) => (prev[url] ? prev : { ...prev, [url]: dropdownCache.get(url)! }))
        continue
      }
      // Resolve the URL:
      //   - absolute (http/https) → call axios with the full URL (skips baseURL)
      //   - "/api/..."           → strip the leading "/api/" since axios baseURL already includes it
      //   - "/foo/..."           → strip the leading slash
      const isAbsolute = /^https?:\/\//i.test(url)
      const path = isAbsolute
        ? url
        : url.replace(/^\/+/, '').replace(/^api\//, '')
      setDropdownLoading((prev) => ({ ...prev, [url]: true }))
      void api
        .get(path)
        .then((res) => {
          if (cancelled) return
          const opts = normalizeOptions(res.data)
          dropdownCache.set(url, opts)
          setDropdowns((prev) => ({ ...prev, [url]: opts }))
        })
        .catch((err) => {
          if (cancelled) return
          // Surface a soft error inline next to the field.
          setErrors((prev) => ({
            ...prev,
            [`__dropdown__${url}`]:
              err?.response?.data?.message ?? `Failed to load options from ${url}`,
          }))
        })
        .finally(() => {
          if (!cancelled) {
            setDropdownLoading((prev) => ({ ...prev, [url]: false }))
          }
        })
    }
    return () => {
      cancelled = true
    }
  }, [fields, values.country])

  const setValue = (key: string, value: Value) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    // Clear field-level error on change
    setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev))
  }

  // Reset state selection if country changes so we don't submit invalid state/country combos
  const countryValue = values.country
  useEffect(() => {
    if (values.state) {
      setValues((prev) => ({ ...prev, state: '' }))
    }
  }, [countryValue])

  const validate = useMemo(
    () => () => {
      const next: Record<string, string> = {}
      for (const f of fields) {
        if (f.required) {
          const v = values[f.key]
          if (v === undefined || v === null || v === '' || v === false) {
            next[f.key] = `${f.label} is required`
          }
        }
      }
      if (screen === 'organization') {
        const numEmployees = Number(values.numEmployees || values.num_employees || 0)
        if (numEmployees > trialPeriodLicenses) {
          next.numEmployees = `Number of Employees (${numEmployees}) cannot exceed the trial period licenses limit (${trialPeriodLicenses}).`
          next.num_employees = `Number of Employees (${numEmployees}) cannot exceed the trial period licenses limit (${trialPeriodLicenses}).`
        }
      }
      return next
    },
    [fields, values, trialPeriodLicenses, screen],
  )

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    const v = validate()
    setErrors(v)
    if (Object.keys(v).length > 0) return

    setSubmitting(true)
    try {
      await onSubmit(values)
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { message?: string } }; message?: string }
      setSubmitError(e2?.response?.data?.message ?? e2?.message ?? 'Submit failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingConfig) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      {headerSlot}

      {fields.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
          No additional dynamic fields are configured for this role.
        </Typography>
      ) : (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
          gap: 2,
        }}
      >
        {fields.map((f) => {
          const value = values[f.key]
          const err = errors[f.key] || ''
          const labelWithRequired = f.required ? `${f.label} *` : f.label

          if (f.type === 'select') {
            const apiUrl = f.dropdown_api
            let opts: DropdownOption[] = []
            if (f.dropdown_source === 'api' && apiUrl) {
              opts = dropdowns[apiUrl] ?? []
            } else if (f.dropdown_source === 'static') {
              opts = (f.options || []).map((o) => ({ value: o, label: o }))
            } else {
              opts = (f.options || []).map((o) => ({ value: o, label: o }))
            }

            if (f.key === 'status' && opts.length === 0) {
              opts = [
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' }
              ];
            }
            const isLoading = f.dropdown_source === 'api' && !!apiUrl && dropdownLoading[apiUrl]
            const dropdownErr =
              f.dropdown_source === 'api' && apiUrl ? errors[`__dropdown__${apiUrl}`] : ''
            return (
              <TextField
                key={f.key}
                select
                size="small"
                label={labelWithRequired}
                value={(value as string) ?? ''}
                onChange={(e) => setValue(f.key, e.target.value)}
                error={!!err || !!dropdownErr}
                helperText={err || dropdownErr || (isLoading ? 'Loading options…' : '')}
                disabled={isLoading || readOnly || f.key === 'industryId' || f.key === 'industry_id'}
                fullWidth
                SelectProps={{
                  MenuProps: {
                    PaperProps: {
                      style: {
                        maxHeight: 250,
                      },
                    },
                  },
                }}
              >
                {opts.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </TextField>
            )
          }

          if (f.type === 'textarea') {
            return (
              <TextField
                key={f.key}
                size="small"
                label={labelWithRequired}
                value={(value as string) ?? ''}
                onChange={(e) => setValue(f.key, e.target.value)}
                error={!!err}
                helperText={err}
                multiline
                rows={3}
                fullWidth
                disabled={readOnly}
                sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}
              />
            )
          }

          if (f.type === 'checkbox') {
            return (
              <FormControlLabel
                key={f.key}
                control={
                  <Checkbox
                    checked={!!value}
                    onChange={(e) => setValue(f.key, e.target.checked)}
                    disabled={readOnly}
                  />
                }
                label={labelWithRequired}
              />
            )
          }

          if (f.type === 'phone') {
            const valStr = (value as string) ?? ''
            let detectedCode = '+91' // default
            let localNumber = valStr

            for (const dc of DIALING_CODES) {
              if (valStr.startsWith(dc.code + ' ')) {
                detectedCode = dc.code
                localNumber = valStr.substring(dc.code.length + 1)
                break
              } else if (valStr.startsWith(dc.code)) {
                detectedCode = dc.code
                localNumber = valStr.substring(dc.code.length)
                break
              }
            }

            return (
              <TextField
                key={f.key}
                size="small"
                type="text"
                label={labelWithRequired}
                value={localNumber}
                onChange={(e) => {
                  const nextNum = e.target.value
                  setValue(f.key, `${detectedCode} ${nextNum}`.trim())
                }}
                error={!!err}
                helperText={err}
                fullWidth
                disabled={readOnly}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start" sx={{ mr: 1 }}>
                        <Select
                          variant="standard"
                          value={detectedCode}
                          onChange={(e) => {
                            const nextCode = e.target.value as string
                            setValue(f.key, `${nextCode} ${localNumber}`.trim())
                          }}
                          disabled={readOnly}
                          disableUnderline
                          renderValue={(value) => {
                            const match = DIALING_CODES.find((dc) => dc.code === value)
                            return match ? `${match.flag} ${match.code}` : (value as string)
                          }}
                          MenuProps={{
                            PaperProps: {
                              style: {
                                maxHeight: 300,
                                width: 220,
                              },
                            },
                          }}
                          sx={{
                            fontSize: '0.9rem',
                            '& .MuiSelect-select': {
                              display: 'flex',
                              alignItems: 'center',
                              pr: '18px !important',
                              pl: 0.5,
                            }
                          }}
                        >
                          {DIALING_CODES.map((dc, idx) => (
                            <MenuItem key={`${dc.code}-${dc.flag}-${idx}`} value={dc.code}>
                              <Box component="span" sx={{ mr: 1 }}>{dc.flag}</Box>
                              <Box component="span">{dc.code}</Box>
                              <Box component="span" sx={{ ml: 1, opacity: 0.5, fontSize: '0.8rem' }}>
                                ({dc.label.split('(')[1]}
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </InputAdornment>
                    )
                  }
                }}
              />
            )
          }

          if (f.type === 'image') {
            const hasValue = typeof value === 'string' && value.startsWith('data:image');
            const previewUrl = typeof value === 'string' ? value : '';
            return (
              <Box key={f.key} sx={{ gridColumn: { xs: '1', sm: '1 / -1' }, mb: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 500 }}>
                  {labelWithRequired}
                </Typography>
                <input
                  type="file"
                  id={`image-upload-${f.key}`}
                  accept="image/png, image/jpeg, image/jpg, image/gif, image/webp, image/svg+xml"
                  style={{ display: 'none' }}
                  disabled={readOnly}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    // Format Validation
                    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'];
                    if (!allowedTypes.includes(file.type)) {
                      setErrors(prev => ({ ...prev, [f.key]: 'Invalid image format. Supported formats: PNG, JPEG, JPG, GIF, WebP, SVG.' }));
                      return;
                    }

                    // Size Validation: limit to 20MB
                    const maxSize = 20 * 1024 * 1024;
                    if (file.size > maxSize) {
                      setErrors(prev => ({ ...prev, [f.key]: 'File size must not exceed 20 MB.' }));
                      return;
                    }

                    // Clear error and convert to Base64
                    setErrors(prev => {
                      const next = { ...prev };
                      delete next[f.key];
                      return next;
                    });

                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const base64 = event.target?.result as string;
                      setValue(f.key, base64);
                      // If the form has an imageName field, update it automatically
                      if (values.hasOwnProperty('imageName')) {
                        setValue('imageName', file.name);
                      } else if (values.hasOwnProperty('image_name')) {
                        setValue('image_name', file.name);
                      }
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                <Stack direction="row" spacing={2} alignItems="center">
                  {hasValue ? (
                    <Box
                      component="img"
                      src={previewUrl}
                      sx={{
                        width: 120,
                        height: 75,
                        borderRadius: 1,
                        objectFit: 'cover',
                        border: '1px solid',
                        borderColor: 'divider',
                        boxShadow: 1
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 120,
                        height: 75,
                        borderRadius: 1,
                        bgcolor: 'action.hover',
                        border: '1px dashed',
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">No Image</Typography>
                    </Box>
                  )}
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="outlined"
                        size="small"
                        disabled={readOnly}
                        onClick={() => document.getElementById(`image-upload-${f.key}`)?.click()}
                        sx={{ textTransform: 'none' }}
                      >
                        {hasValue ? 'Change Image' : 'Select Image'}
                      </Button>
                      {hasValue && (
                        <Button
                          variant="outlined"
                          size="small"
                          color="error"
                          disabled={readOnly}
                          onClick={() => {
                            setValue(f.key, '');
                            if (values.hasOwnProperty('imageName')) {
                              setValue('imageName', '');
                            } else if (values.hasOwnProperty('image_name')) {
                              setValue('image_name', '');
                            }
                          }}
                          sx={{ textTransform: 'none' }}
                        >
                          Remove
                        </Button>
                      )}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      Max size: 20MB. Supports PNG, JPG, JPEG, GIF, WebP, SVG.
                    </Typography>
                    {err && (
                      <Typography variant="caption" color="error">
                        {err}
                      </Typography>
                    )}
                  </Stack>
                </Stack>
              </Box>
            );
          }

          // text-like inputs
          const inputType =
            f.type === 'email' ? 'email' :
            f.type === 'number' ? 'number' :
            f.type === 'date' ? 'date' :
            'text'
          return (
            <TextField
              key={f.key}
              size="small"
              type={inputType}
              label={labelWithRequired}
              value={(value as string | number) ?? ''}
              onChange={(e) => setValue(
                f.key,
                inputType === 'number' && e.target.value !== ''
                  ? Number(e.target.value)
                  : e.target.value,
              )}
              error={!!err}
              helperText={err}
              fullWidth
              disabled={readOnly || f.key === 'industryId' || f.key === 'industry_id'}
              InputLabelProps={inputType === 'date' ? { shrink: true } : undefined}
            />
          )
        })}
      </Box>
      )}

      {submitError && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setSubmitError(null)}>
          {submitError}
        </Alert>
      )}

      {!hideActions && (
        fullWidthSubmit ? (
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={submitting}
            sx={{ mt: 2.5 }}
          >
            {submitting ? <CircularProgress size={18} sx={{ color: 'white' }} /> : submitLabel}
          </Button>
        ) : (
          <Stack direction="row" spacing={2} sx={{ mt: 3, justifyContent: 'flex-end' }}>
            {readOnly ? (
              <Button variant="contained" onClick={onCancel}>Close</Button>
            ) : (
              <>
                {onCancel && (
                  <Button onClick={onCancel} disabled={submitting}>Cancel</Button>
                )}
                <Button type="submit" variant="contained" disabled={submitting}>
                  {submitting ? <CircularProgress size={18} sx={{ color: 'white' }} /> : submitLabel}
                </Button>
              </>
            )}
          </Stack>
        )
      )}
    </Box>
  )
}

export default DynamicForm
