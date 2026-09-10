import { ExitIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/(app)/logout-action";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="ghost" size="sm">
        <ExitIcon /> Log out
      </Button>
    </form>
  );
}
