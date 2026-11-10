import { toast } from "react-toastify";
import { i18n } from "../translate/i18n";
import { isString } from 'lodash';

const toastError = err => {
    const errorMsg = err.response?.data?.error;
    if (errorMsg) {
        if (i18n.exists(`backendErrors.${errorMsg}`)) {
            toast.error(i18n.t(`backendErrors.${errorMsg}`), {
                toastId: errorMsg,
                autoClose: 3000,
            });
            return;
        } else {
            toast.error(errorMsg, {
                toastId: errorMsg,
                autoClose: 3000,
            });
            return;
        }
    } else if (isString(err)) {
        toast.error(err);
        return;
    } else {
        const msg = err.message || "Ocorreu um erro ao processar a solicitação";
        toast.error(msg);
        return;
    }
};

export default toastError;
