import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "flowbite-react";
import { AppIcon } from "./AppIcon";
import { iconRegistry } from "../../config/iconRegistry";

describe("AppIcon", () => {
  it("renders every registered icon name without throwing", () => {
    for (const name of Object.keys(iconRegistry) as (keyof typeof iconRegistry)[]) {
      const { container, unmount } = render(<AppIcon name={name} />);
      expect(container.querySelector("svg")).not.toBeNull();
      unmount();
    }
  });

  it("is decorative by default (aria-hidden)", () => {
    const { container } = render(<AppIcon name="chat" />);
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("applies the requested size", () => {
    const { container } = render(<AppIcon name="chat" size={32} />);
    expect(container.querySelector("svg")?.getAttribute("width")).toBe("32");
  });

  it("renders correctly inside a Flowbite Button (icon + text, per §9.2)", () => {
    const { getByRole } = render(
      <Button>
        <AppIcon name="chat" className="mr-2" />
        Enviar
      </Button>,
    );
    const button = getByRole("button", { name: "Enviar" });
    expect(button.querySelector("svg")).not.toBeNull();
  });
});
