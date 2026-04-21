const baseDocument = {
  pageSize: 'A4',
  pageMargins: [32, 32, 32, 32],
  defaultStyle: {
    font: 'Roboto',
    fontSize: 10,
  },
  styles: {
    title: {
      fontSize: 18,
      bold: true,
      margin: [0, 0, 0, 10],
    },
    subtitle: {
      fontSize: 11,
      margin: [0, 0, 0, 14],
    },
    tableHeader: {
      bold: true,
      color: '#111827',
      fillColor: '#eef2ff',
    },
  },
};

const robotoFonts = {
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf',
  },
};

const getPdfMake = (pdfMakeModule) =>
  pdfMakeModule.default?.default ||
  pdfMakeModule.default ||
  pdfMakeModule['module.exports'] ||
  pdfMakeModule;

const getVfs = (pdfFontsModule) => {
  const rawFonts =
    pdfFontsModule.default?.default ||
    pdfFontsModule.default ||
    pdfFontsModule['module.exports'] ||
    pdfFontsModule;

  return rawFonts.vfs || rawFonts.pdfMake?.vfs || rawFonts;
};

const registerRobotoFonts = (pdfMake, vfs) => {
  if (typeof pdfMake.addFontContainer === 'function') {
    pdfMake.addFontContainer({ vfs, fonts: robotoFonts });
  } else {
    if (typeof pdfMake.addVirtualFileSystem === 'function') {
      pdfMake.addVirtualFileSystem(vfs);
    } else {
      pdfMake.vfs = vfs;
    }

    if (typeof pdfMake.setFonts === 'function') {
      pdfMake.setFonts(robotoFonts);
    } else {
      pdfMake.fonts = robotoFonts;
    }
  }

  if (
    pdfMake.virtualfs?.writeFileSync &&
    !pdfMake.virtualfs.existsSync?.('Roboto-Medium.ttf')
  ) {
    Object.entries(vfs).forEach(([fileName, fileData]) => {
      const data = typeof fileData === 'object' ? fileData.data : fileData;
      const encoding = typeof fileData === 'object' ? fileData.encoding || 'base64' : 'base64';
      pdfMake.virtualfs.writeFileSync(fileName, data, encoding);
    });
  }
};

export async function downloadPdf(fileName, documentDefinition) {
  try {
    const pdfMakeModule = await import('pdfmake/build/pdfmake.js');
    const pdfMake = getPdfMake(pdfMakeModule);

    if (typeof window !== 'undefined') {
      window.pdfMake = pdfMake;
    }

    const pdfFontsModule = await import('pdfmake/build/vfs_fonts.js');
    const vfs = getVfs(pdfFontsModule);

    if (!vfs['Roboto-Medium.ttf']) {
      throw new Error('PDF fonts were not loaded correctly');
    }

    registerRobotoFonts(pdfMake, vfs);

    if (!pdfMake.virtualfs?.existsSync?.('Roboto-Medium.ttf')) {
      throw new Error('Roboto font was not registered in PDF virtual file system');
    }

    const pdf = pdfMake.createPdf({
      ...baseDocument,
      ...documentDefinition,
      styles: {
        ...baseDocument.styles,
        ...(documentDefinition.styles || {}),
      },
      defaultStyle: {
        ...baseDocument.defaultStyle,
        ...(documentDefinition.defaultStyle || {}),
      },
    });

    await pdf.download(fileName);
    return true;
  } catch (error) {
    console.error('PDF export failed:', error);
    if (typeof window !== 'undefined') {
      window.alert('Не удалось создать PDF. Ошибка записана в консоль, страница продолжит работать.');
    }
    return false;
  }
}
