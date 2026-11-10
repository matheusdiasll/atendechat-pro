import React, { useState, useEffect } from "react";

import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";

import { makeStyles } from "@material-ui/core/styles";
import { green, blue } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import CircularProgress from "@material-ui/core/CircularProgress";
import Typography from "@material-ui/core/Typography";
import Paper from "@material-ui/core/Paper";
import { i18n } from "../../translate/i18n";
import { MenuItem, FormControl, InputLabel, Select } from "@material-ui/core";
import { Visibility, VisibilityOff, CloudUpload, CheckCircle, Description } from "@material-ui/icons";
import { InputAdornment, IconButton } from "@material-ui/core";
import QueueSelectSingle from "../../components/QueueSelectSingle";

import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles(theme => ({
    root: {
        display: "flex",
        flexWrap: "wrap",
    },
    multFieldLine: {
        display: "flex",
        "& > *:not(:last-child)": {
            marginRight: theme.spacing(1),
        },
    },
    btnWrapper: {
        position: "relative",
    },
    buttonProgress: {
        color: green[500],
        position: "absolute",
        top: "50%",
        left: "50%",
        marginTop: -12,
        marginLeft: -12,
    },
    formControl: {
        margin: theme.spacing(1),
        minWidth: 120,
    },
    pdfUploadBox: {
        marginTop: theme.spacing(2),
        marginBottom: theme.spacing(2),
        padding: theme.spacing(2),
        border: "2px dashed #4caf50",
        borderRadius: 8,
        backgroundColor: "#f9fbf9",
        textAlign: "center"
    }
}));

const PromptSchema = Yup.object().shape({
    name: Yup.string().min(3, "Muito curto!").max(100, "Muito longo!").required("Obrigatório"),
    prompt: Yup.string().min(10, "Muito curto!").required("Descreva o treinamento para Inteligência Artificial"),
    voice: Yup.string().required("Informe o modo para Voz"),
    maxTokens: Yup.number().required("Informe o número máximo de tokens"),
    temperature: Yup.number().required("Informe a temperatura"),
    apiKey: Yup.string().required("Informe a Chave de API"),
    queueId: Yup.number().required("Informe a fila"),
    maxMessages: Yup.number().required("Informe o número máximo de mensagens")
});

const PromptModal = ({ open, onClose, promptId }) => {
    const classes = useStyles();
    const [selectedVoice, setSelectedVoice] = useState("texto");
    const [selectedProvider, setSelectedProvider] = useState("gemini");
    const [selectedModel, setSelectedModel] = useState("gemini-3.8-flash");
    const [showApiKey, setShowApiKey] = useState(false);
    const [showApiKey2, setShowApiKey2] = useState(false);
    const [uploadingPdf, setUploadingPdf] = useState(false);
    const [pdfFileName, setPdfFileName] = useState("");

    const handleToggleApiKey = () => setShowApiKey(!showApiKey);
    const handleToggleApiKey2 = () => setShowApiKey2(!showApiKey2);

    const initialState = {
        name: "",
        prompt: "",
        provider: "gemini",
        model: "gemini-3.8-flash",
        voice: "texto",
        voiceKey: "",
        voiceRegion: "",
        maxTokens: 2048,
        temperature: 0.7,
        apiKey: "",
        apiKey2: "",
        knowledgePdf: "",
        queueId: null,
        maxMessages: 15
    };

    const [prompt, setPrompt] = useState(initialState);

    useEffect(() => {
        const fetchPrompt = async () => {
            if (!promptId) {
                setPrompt(initialState);
                setPdfFileName("");
                setSelectedProvider("gemini");
                setSelectedModel("gemini-3.8-flash");
                return;
            }
            try {
                const { data } = await api.get(`/prompt/${promptId}`);
                setPrompt(prevState => ({ ...prevState, ...data }));
                setSelectedVoice(data.voice || "texto");
                setSelectedProvider(data.provider || "gemini");
                setSelectedModel(data.model || "gemini-3.8-flash");
                if (data.knowledgePdf) {
                    setPdfFileName(data.knowledgePdf);
                }
            } catch (err) {
                toastError(err);
            }
        };

        fetchPrompt();
    }, [promptId, open]);

    const handleClose = () => {
        setPrompt(initialState);
        setSelectedVoice("texto");
        setPdfFileName("");
        onClose();
    };

    const handlePdfFileChange = async (e, setFieldValue) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith(".pdf")) {
            toast.error("Por favor, selecione um arquivo em formato PDF.");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("typeArch", "prompts");

        setUploadingPdf(true);
        try {
            const { data } = await api.post("/prompt/upload-pdf", formData);
            setFieldValue("knowledgePdf", data.filename);
            setPdfFileName(data.originalName || data.filename);
            toast.success("PDF da Base de Conhecimento anexado com sucesso!");
        } catch (err) {
            toastError(err);
        } finally {
            setUploadingPdf(false);
        }
    };

    const handleSavePrompt = async values => {
        const promptData = {
            ...values,
            voice: selectedVoice,
            provider: selectedProvider,
            model: selectedModel
        };
        if (!values.queueId) {
            toastError("Informe o setor / fila");
            return;
        }
        try {
            if (promptId) {
                await api.put(`/prompt/${promptId}`, promptData);
            } else {
                await api.post("/prompt", promptData);
            }
            toast.success(i18n.t("promptModal.success"));
        } catch (err) {
            toastError(err);
        }
        handleClose();
    };

    return (
        <div className={classes.root}>
            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth="md"
                scroll="paper"
                fullWidth
            >
                <DialogTitle id="form-dialog-title">
                    {promptId
                        ? `${i18n.t("promptModal.title.edit")}`
                        : `${i18n.t("promptModal.title.add")}`}
                </DialogTitle>
                <Formik
                    initialValues={prompt}
                    enableReinitialize={true}
                    validationSchema={PromptSchema}
                    onSubmit={(values, actions) => {
                        setTimeout(() => {
                            handleSavePrompt(values);
                            actions.setSubmitting(false);
                        }, 400);
                    }}
                >
                    {({ touched, errors, isSubmitting, values, setFieldValue }) => (
                        <Form style={{ width: "100%" }}>
                            <DialogContent dividers>
                                <div className={classes.multFieldLine}>
                                    <Field
                                        as={TextField}
                                        label={i18n.t("promptModal.form.name")}
                                        name="name"
                                        error={touched.name && Boolean(errors.name)}
                                        helperText={touched.name && errors.name}
                                        variant="outlined"
                                        margin="dense"
                                        style={{ flex: 2 }}
                                    />
                                    <FormControl variant="outlined" margin="dense" style={{ flex: 1 }}>
                                        <InputLabel>Provedor IA</InputLabel>
                                        <Select
                                            value={selectedProvider}
                                            onChange={e => {
                                                setSelectedProvider(e.target.value);
                                                if (e.target.value === "gemini") {
                                                    setSelectedModel("gemini-3.8-flash");
                                                } else {
                                                    setSelectedModel("gpt-4o");
                                                }
                                            }}
                                            label="Provedor IA"
                                        >
                                            <MenuItem value="gemini">Google Gemini (Recomendado)</MenuItem>
                                            <MenuItem value="openai">OpenAI (ChatGPT)</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <FormControl variant="outlined" margin="dense" style={{ flex: 1 }}>
                                        <InputLabel>Modelo</InputLabel>
                                        <Select
                                            value={selectedModel}
                                            onChange={e => setSelectedModel(e.target.value)}
                                            label="Modelo"
                                        >
                                            {selectedProvider === "gemini" ? (
                                                [
                                                    <MenuItem key="gemini-3.8-flash" value="gemini-3.8-flash">
                                                        Gemini 3.8 Flash (Ultra Rápido)
                                                    </MenuItem>,
                                                    <MenuItem key="gemini-3-pro" value="gemini-3-pro">
                                                        Gemini 3 Pro (Raciocínio Profundo)
                                                    </MenuItem>
                                                ]
                                            ) : (
                                                [
                                                    <MenuItem key="gpt-4o" value="gpt-4o">GPT-4o</MenuItem>,
                                                    <MenuItem key="gpt-4o-mini" value="gpt-4o-mini">GPT-4o Mini</MenuItem>,
                                                    <MenuItem key="gpt-3.5-turbo" value="gpt-3.5-turbo">GPT-3.5 Turbo</MenuItem>
                                                ]
                                            )}
                                        </Select>
                                    </FormControl>
                                </div>

                                <div className={classes.multFieldLine}>
                                    <FormControl fullWidth margin="dense" variant="outlined">
                                        <Field
                                            as={TextField}
                                            label="Chave API 1 (Google AI Studio / Pro)"
                                            name="apiKey"
                                            type={showApiKey ? 'text' : 'password'}
                                            error={touched.apiKey && Boolean(errors.apiKey)}
                                            helperText={touched.apiKey && errors.apiKey}
                                            variant="outlined"
                                            margin="dense"
                                            fullWidth
                                            InputProps={{
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <IconButton onClick={handleToggleApiKey}>
                                                            {showApiKey ? <VisibilityOff /> : <Visibility />}
                                                        </IconButton>
                                                    </InputAdornment>
                                                ),
                                            }}
                                        />
                                    </FormControl>

                                    <FormControl fullWidth margin="dense" variant="outlined">
                                        <Field
                                            as={TextField}
                                            label="Chave API 2 (Conta Pro - Redundância e Failover)"
                                            name="apiKey2"
                                            type={showApiKey2 ? 'text' : 'password'}
                                            variant="outlined"
                                            margin="dense"
                                            fullWidth
                                            InputProps={{
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <IconButton onClick={handleToggleApiKey2}>
                                                            {showApiKey2 ? <VisibilityOff /> : <Visibility />}
                                                        </IconButton>
                                                    </InputAdornment>
                                                ),
                                            }}
                                        />
                                    </FormControl>
                                </div>

                                {/* Upload de PDF da Base de Conhecimento */}
                                <Paper className={classes.pdfUploadBox} elevation={0}>
                                    <Typography variant="subtitle2" style={{ fontWeight: "bold", marginBottom: 8, color: "#2e7d32" }}>
                                        📄 Base de Conhecimento em PDF (Gemini 3.8 Flash)
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary" style={{ marginBottom: 12 }}>
                                        Suba o PDF com catálogo, regras de preço e dúvidas do seu produto. A IA lerá o documento inteiro!
                                    </Typography>

                                    <input
                                        accept="application/pdf"
                                        style={{ display: "none" }}
                                        id="pdf-upload-button"
                                        type="file"
                                        onChange={e => handlePdfFileChange(e, setFieldValue)}
                                    />
                                    <label htmlFor="pdf-upload-button">
                                        <Button
                                            variant="contained"
                                            color="secondary"
                                            component="span"
                                            startIcon={uploadingPdf ? <CircularProgress size={20} color="inherit" /> : <CloudUpload />}
                                            disabled={uploadingPdf}
                                        >
                                            {uploadingPdf ? "Enviando PDF..." : "Selecionar Arquivo PDF"}
                                        </Button>
                                    </label>

                                    {pdfFileName && (
                                        <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#1b5e20" }}>
                                            <CheckCircle style={{ color: "#4caf50", fontSize: 20 }} />
                                            <Typography variant="body2" style={{ fontWeight: 600 }}>
                                                Arquivo ativo: {pdfFileName}
                                            </Typography>
                                        </div>
                                    )}
                                </Paper>

                                <Field
                                    as={TextField}
                                    label="Prompt / Instruções do Agente"
                                    name="prompt"
                                    error={touched.prompt && Boolean(errors.prompt)}
                                    helperText={touched.prompt && errors.prompt}
                                    variant="outlined"
                                    margin="dense"
                                    fullWidth
                                    rows={8}
                                    multiline={true}
                                />

                                <QueueSelectSingle />

                                <div className={classes.multFieldLine}>
                                    <Field
                                        as={TextField}
                                        label={i18n.t("promptModal.form.temperature")}
                                        name="temperature"
                                        error={touched.temperature && Boolean(errors.temperature)}
                                        helperText={touched.temperature && errors.temperature}
                                        variant="outlined"
                                        margin="dense"
                                        fullWidth
                                    />
                                    <Field
                                        as={TextField}
                                        label={i18n.t("promptModal.form.max_tokens")}
                                        name="maxTokens"
                                        error={touched.maxTokens && Boolean(errors.maxTokens)}
                                        helperText={touched.maxTokens && errors.maxTokens}
                                        variant="outlined"
                                        margin="dense"
                                        fullWidth
                                    />
                                    <Field
                                        as={TextField}
                                        label={i18n.t("promptModal.form.max_messages")}
                                        name="maxMessages"
                                        error={touched.maxMessages && Boolean(errors.maxMessages)}
                                        helperText={touched.maxMessages && errors.maxMessages}
                                        variant="outlined"
                                        margin="dense"
                                        fullWidth
                                    />
                                </div>
                            </DialogContent>
                            <DialogActions>
                                <Button
                                    onClick={handleClose}
                                    color="secondary"
                                    disabled={isSubmitting}
                                    variant="outlined"
                                >
                                    {i18n.t("promptModal.buttons.cancel")}
                                </Button>
                                <Button
                                    type="submit"
                                    color="primary"
                                    disabled={isSubmitting}
                                    variant="contained"
                                    className={classes.btnWrapper}
                                >
                                    {promptId
                                        ? `${i18n.t("promptModal.buttons.okEdit")}`
                                        : `${i18n.t("promptModal.buttons.okAdd")}`}
                                    {isSubmitting && (
                                        <CircularProgress
                                            size={24}
                                            className={classes.buttonProgress}
                                        />
                                    )}
                                </Button>
                            </DialogActions>
                        </Form>
                    )}
                </Formik>
            </Dialog>
        </div>
    );
};

export default PromptModal;
