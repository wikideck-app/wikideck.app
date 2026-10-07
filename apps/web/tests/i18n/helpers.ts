import { createFormatter, createTranslator } from "next-intl";
import { defaultLocale, timeZone } from "@/i18n/config";
import { formats } from "@/i18n/formats";
import messages from "@/messages/fr";

export const locale = defaultLocale;
export { messages, formats };

type Values = Record<string, unknown>;
type LooseTranslator = {
  (key: string, values?: Values): string;
  rich(key: string, values: Values): unknown;
};

/** Traducteur hors React, avec les mêmes messages et formats que l'application. */
export function translator(namespace: string, onError?: (e: Error) => void): LooseTranslator {
  return createTranslator({
    locale,
    messages,
    namespace: namespace as never,
    formats,
    timeZone,
    ...(onError && { onError, getMessageFallback: ({ namespace: ns, key }) => `${ns}.${key}` }),
  }) as unknown as LooseTranslator;
}

export const formatter = createFormatter({ locale, formats, timeZone });

// l'espace des milliers et celui avant « % » ou « € » sont insécables : on les normalise pour comparer
export const plain = (value: string) => value.replace(/[  ]/g, " ");
