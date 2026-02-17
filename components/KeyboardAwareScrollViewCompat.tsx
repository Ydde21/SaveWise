// template
import { Platform, ScrollView, ScrollViewProps } from "react-native";
import {
  KeyboardAwareScrollView,
  KeyboardAwareScrollViewProps,
} from "react-native-keyboard-controller";

type Props = KeyboardAwareScrollViewProps & ScrollViewProps;

export function KeyboardAwareScrollViewCompat({
  children,
  keyboardShouldPersistTaps = "handled",
  bottomOffset,
  extraKeyboardSpace,
  disableScrollOnKeyboardHide,
  enabled,
  ScrollViewComponent,
  ...props
}: Props) {
  if (Platform.OS === "web") {
    return (
      <ScrollView keyboardShouldPersistTaps={keyboardShouldPersistTaps} {...props}>
        {children}
      </ScrollView>
    );
  }
  return (
    <KeyboardAwareScrollView
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      bottomOffset={bottomOffset}
      extraKeyboardSpace={extraKeyboardSpace}
      disableScrollOnKeyboardHide={disableScrollOnKeyboardHide}
      enabled={enabled}
      ScrollViewComponent={ScrollViewComponent}
      {...props}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}
